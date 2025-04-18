/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChartConfiguration, ChartDataset, Plugin } from "chart.js";
import { MatrixDataPoint } from "chartjs-chart-matrix";
import { Moment } from "moment";
import { renderChart } from "../../../charts/canvas";
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
  const report = {
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
    localChart: await createCohortRetentionHeatMap(
      cohorts,
      periods,
      periodName,
    ),
  };
  return report;
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
  value: number;
  percentage: number;
};

async function createCohortRetentionHeatMap(
  cohorts: number[][],
  periods: Period[],
  periodName: PeriodName,
): Promise<Buffer> {
  // chartArea is undefined before the chart is laid out
  // so we can't calculate matrix cell size during initial data calculation
  const cellSizePlugin: Plugin<"matrix"> = {
    id: "matrix-cell-size",
    afterLayout: (chart) => {
      const dataset = chart.data.datasets[0];
      const chartArea = chart.chartArea;

      const cellWidth = chartArea.width / periods.length;
      const cellHeight = chartArea.height / cohorts.length;

      // -1 stops overlaps
      dataset.width = () => cellWidth - 1;
      dataset.height = () => cellHeight - 1;
    },
  };

  const matrixLabelPlugin: Plugin<"matrix"> = {
    id: "matrix-cell-labels",
    afterDatasetsDraw: (chart) => {
      const ctx = chart.ctx;
      const dataset = chart.data.datasets[0] as ChartDataset<
        "matrix",
        CohortRetentionHeatMapPoint[]
      >;
      const meta = chart.getDatasetMeta(0);

      dataset.data.forEach((dataPoint, index) => {
        const rect = meta.data[index];
        if (!rect) return;

        const { x, y, width, height } = rect.getProps(
          ["x", "y", "width", "height"],
          true,
        );

        let label: string;
        if (dataPoint.x === 0) {
          label = dataPoint.value.toString();
        } else {
          const initialValue = cohorts[dataPoint.y][0];
          const percent =
            initialValue > 0
              ? Math.round((dataPoint.value / initialValue) * 100)
              : 0;
          label = `${percent}%`;
        }

        ctx.save();
        ctx.fillStyle = "black";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + width / 2, y + height / 2);
        ctx.restore();
      });
    },
  };

  const maximumPercentageAfterInitialCohortSize: number = Math.max(
    ...cohorts.flatMap((cohort) =>
      cohort.map((value) => value / cohort[0]).slice(1),
    ),
  );
  const colorInterpolator = createColorInterpolator([
    "#f04a63",
    "#FFA071",
    "#FFEE8C",
  ]);
  const chartConfiguration: ChartConfiguration<
    "matrix",
    CohortRetentionHeatMapPoint[]
  > = {
    type: "matrix",
    data: {
      datasets: [
        {
          data: cohorts.flatMap((cohort, cohortIndex) => {
            return cohort.map((value, periodIndex) => ({
              x: periodIndex,
              y: cohortIndex,
              value: value,
              percentage: value / cohort[0],
            }));
          }),
          label: "Cohort Retention",
          backgroundColor: (context: any) => {
            const data = context.dataset.data[context.dataIndex];

            if (data.x === 0) {
              return "#93e693";
            }

            const interpolation =
              data.percentage / maximumPercentageAfterInitialCohortSize;
            return colorInterpolator(interpolation);
          },
          borderColor: "rgba(0, 0, 0, 0.1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      aspectRatio: 1,
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: periods.length - 1,
          ticks: {
            stepSize: 1,
            callback: (value) => `+${value}`,
            font: { size: 10 },
          },
          offset: true,
          title: {
            display: true,
            text: `Cohort Progression (per ${periodName})`,
            font: {
              size: 12,
              weight: "bold",
            },
          },
        },
        y: {
          type: "linear",
          min: 0,
          max: cohorts.length - 1,
          ticks: {
            stepSize: 1,
            callback: (value) => `#${value}`,
            font: { size: 10 },
          },
          offset: true,
          title: {
            display: true,
            text: "Cohort Start",
            font: {
              size: 12,
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
            size: 16,
            weight: "bold",
          },
          padding: {
            top: 10,
            bottom: 20,
          },
        },
      },
    },
    plugins: [cellSizePlugin, matrixLabelPlugin],
  };
  return renderChart(chartConfiguration);
}
