/* eslint-disable @typescript-eslint/no-explicit-any */
import { Chart, ChartConfiguration, ChartDataset, Plugin } from "chart.js";
import { MatrixDataPoint } from "chartjs-chart-matrix";
import { Moment } from "moment";
import { renderChart } from "../../../charts/canvas";
import {
  createColorInterpolator,
  getFontColorForBackgroundColor,
  SEQUENTIAL_BLUE_PALETTE,
  SEQUENTIAL_GREEN_PALETTE,
} from "../../../charts/color";
import { matrixAutoScaleCellSize } from "../../../charts/plugins/matrix";
import { PosthogEvent } from "../../events";
import { groupEventsByExecutionEnv } from "../../executionEnvs";
import { createCrossTable } from "../../table";
import { fetchEventsForReportGenerator } from "../events";
import { CohortRetentionReport } from "../reports";
import { getUniqueUserIds, groupEventsByUser } from "../utils";
import {
  calcLastNPeriods,
  groupEventsByPeriods,
  isEventInPeriod,
  Period,
  PeriodName,
} from "./period";

export async function generateCohortRetentionReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number,
  periodName: PeriodName,
): Promise<CohortRetentionReport> {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());
  const periods = calcLastNPeriods(numPeriods, periodName);

  const cohorts = createUserActivityCohorts(events, periods);

  const periodNameShort = periodName[0];
  const table = createCrossTable({
    head: ["", ...periods.map((_, i) => `+${i}${periodNameShort}`)],
    rows: cohorts.map((cohort, i) => ({
      [`${periodNameShort} #${i}`]: calcCohortRetentionTableRow(cohort),
    })),
  });

  const fmt = (m: Moment) => m.format("DD-MM-YY");
  const firstPeriod = periods[0];
  const lastPeriod = periods.at(-1)!;

  return {
    text: [
      "==== Cohort Retention ====",
      "```",
      table.toString(),
      "```",
      `Period of ${periodNameShort}  #0: ${fmt(firstPeriod[0])} - ${fmt(
        firstPeriod[1],
      )}`,
      `Period of ${periodNameShort} #${periods.length - 1}: ${fmt(
        lastPeriod[0],
      )} - ${fmt(lastPeriod[1])}`,
    ],
    bufferChart: await createCohortRetentionHeatMap(
      cohorts,
      periods,
      periodName,
    ),
  };
}

/**
 * Creates cohorts based on user activity within specified periods.
 * Each cohort represents users who had their first event in a given period.
 * @returns A 2D array representing cohorts. Each inner array contains the number of users
 *          from that cohort remaining active in subsequent periods.
 *          The structure is:
 *          [
 *            [cohort_0_after_0_periods, cohort_0_after_1_period, ...],
 *            [cohort_1_after_0_periods, cohort_1_after_1_period, ...],
 *          ]
 *          where each value is the number of users from that cohort remaining at that period.
 */
function createUserActivityCohorts(
  events: PosthogEvent[],
  periods: Period[],
): number[][] {
  const { localEvents } = groupEventsByExecutionEnv(events);
  const uniqueUsersByPeriod = groupEventsByPeriods(localEvents, periods).map(
    (events) => getUniqueUserIds(events),
  );

  const eventsByUser = groupEventsByUser(localEvents);

  const cohorts = periods.map((period, cohortIndex) => {
    const cohortUniqueUsers = uniqueUserIdsWithFirstEventEverInPeriod(
      eventsByUser,
      period,
    );
    return createUniqueUsersCohort(
      cohortIndex,
      cohortUniqueUsers,
      uniqueUsersByPeriod,
    );
  });

  return cohorts;
}

function uniqueUserIdsWithFirstEventEverInPeriod(
  eventsByUser: { [userId: string]: PosthogEvent[] },
  period: Period,
): Set<string> {
  return new Set(
    Object.entries(eventsByUser)
      .filter(([, usersEvents]) => isEventInPeriod(usersEvents[0], period))
      .map(([userId]) => userId),
  );
}

function createUniqueUsersCohort(
  cohortIndex: number,
  cohortUniqueUsers: Set<string>,
  uniqueUsersByPeriod: Set<string>[],
): number[] {
  return [
    cohortUniqueUsers.size,
    ...uniqueUsersByPeriod.slice(cohortIndex + 1).map((periodUniqueUsers) => {
      const cohortUniqueUsersInPeriod =
        cohortUniqueUsers.intersection(periodUniqueUsers);
      return cohortUniqueUsersInPeriod.size;
    }),
  ];
}

/**
 * @param cohort [num_users_at_start, num_users_after_1_period, ...]
 * @returns [num_users_at_start, num_and_perc_users_after_1_period, ...]
 *
 * Examples of returned value:
 *    - `["10", "6 (60%)", "3 (30%)", "0 (0%)"]`
 *    - `["0", "N/A", "N/A"]`
 */
function calcCohortRetentionTableRow(cohort: number[]): string[] {
  const [numUsersAtStart, ...numUsersThroughPeriods] = cohort;
  const numUsersWithRetentionPercentagesThroughPeriods =
    numUsersThroughPeriods.map((n) =>
      numUsersAtStart === 0
        ? "N/A"
        : `${n} (${Math.round((n / numUsersAtStart) * 100)}%)`,
    );
  return [
    numUsersAtStart.toString(),
    ...numUsersWithRetentionPercentagesThroughPeriods,
  ];
}

type CohortRetentionHeatMapPoint = MatrixDataPoint & {
  cohortSize: number;
  retentionPercentage: number;
};

async function createCohortRetentionHeatMap(
  cohorts: number[][],
  periods: Period[],
  periodName: PeriodName,
): Promise<Buffer> {
  const firstColumnColorInterpolator = createColorInterpolator(
    SEQUENTIAL_GREEN_PALETTE,
  );
  const otherColumnsColorInterpolator = createColorInterpolator(
    SEQUENTIAL_BLUE_PALETTE,
  );

  const maxCohortSize = Math.max(...cohorts.map((cohort) => cohort[0]));
  const maxCohortRetentionPercentage: number = Math.max(
    ...cohorts.flatMap((cohort) =>
      cohort.slice(1).map((value) => value / cohort[0]),
    ),
  );

  const chartData: CohortRetentionHeatMapPoint[] = cohorts.flatMap(
    (cohort, cohortIndex) => {
      const cohortInitialSize = cohort[0];
      return cohort.map((cohortSize, periodIndex) => ({
        x: periodIndex,
        y: cohortIndex,
        cohortSize,
        retentionPercentage: cohortSize / cohortInitialSize,
      }));
    },
  );

  const chartDataset: ChartDataset<"matrix", CohortRetentionHeatMapPoint[]> = {
    data: chartData,
    label: "Cohort Retention",
    backgroundColor: (context: {
      dataset: ChartDataset<"matrix", CohortRetentionHeatMapPoint[]>;
      dataIndex: number;
    }) => {
      const point = context.dataset.data[context.dataIndex];

      if (point.x === 0) {
        const ratio = point.cohortSize / maxCohortSize;
        return firstColumnColorInterpolator(ratio);
      } else {
        const ratio = point.retentionPercentage / maxCohortRetentionPercentage;
        return otherColumnsColorInterpolator(ratio);
      }
    },
    borderColor: "rgba(0, 0, 0, 0.1)",
    borderWidth: 1,
    anchorY: "top",
    anchorX: "left",
  };

  const chartConfiguration: ChartConfiguration<
    "matrix",
    CohortRetentionHeatMapPoint[]
  > = {
    type: "matrix",
    data: {
      datasets: [chartDataset],
    },
    options: {
      aspectRatio: 1,
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: periods.length,
          ticks: {
            stepSize: 1,
            callback: (value) => `+${value}`,
            font: { size: 12 },
          },
          offset: false,
          title: {
            display: true,
            text: `Cohort Progression (per ${periodName})`,
            font: {
              size: 14,
              weight: "bold",
            },
          },
        },
        y: {
          type: "linear",
          min: 0,
          max: cohorts.length,
          ticks: {
            stepSize: 1,
            callback: (value) => `#${value}`,
            font: { size: 12 },
          },
          offset: false,
          title: {
            display: true,
            text: "Cohort Start",
            font: {
              size: 14,
              weight: "bold",
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: `Cohort retention chart (per ${periodName})`,
          align: "center",
          font: {
            size: 20,
            weight: "bold",
          },
          padding: {
            top: 10,
            bottom: 10,
          },
        },
      },
    },
    plugins: [matrixAutoScaleCellSize, cohortRetentionChartCellLabels],
  };
  return renderChart(chartConfiguration);
}

/**
 * Plugin to add labels to the cells of the cohort retention heatmap.
 * The labels are either the cohort size (1st column) or the retention percentage (other columns).
 */
const cohortRetentionChartCellLabels: Plugin<"matrix"> = {
  id: "cohort-retention-chart-cell-labels",
  afterDatasetsDraw: (chart) => {
    const canvasContext = chart.ctx;
    const cohortRetentionChart = chart as Chart<
      "matrix",
      CohortRetentionHeatMapPoint[]
    >;

    cohortRetentionChart.data.datasets.forEach((dataset, index) => {
      const meta = cohortRetentionChart.getDatasetMeta(index);

      dataset.data.forEach((dataPoint, index) => {
        const rect = meta.data[index];
        if (!rect) return;

        const { x, y, width, height } = rect.getProps(
          ["x", "y", "width", "height"],
          true,
        );

        let label: string;
        if (dataPoint.x === 0) {
          label = dataPoint.cohortSize.toString();
        } else {
          label = `${Math.round(dataPoint.retentionPercentage * 100)}%`;
        }

        // Get the background color of the cell
        const backgroundColor = (dataset.backgroundColor as any)({
          dataset,
          dataIndex: index,
        });

        canvasContext.save();
        canvasContext.fillStyle =
          getFontColorForBackgroundColor(backgroundColor);
        canvasContext.font = "12px";
        canvasContext.textAlign = "center";
        canvasContext.textBaseline = "middle";
        canvasContext.fillText(label, x + width / 2, y + height / 2);
        canvasContext.restore();
      });
    });
  },
};
