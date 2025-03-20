import _ from "lodash";
import { groupEventsByExecutionEnv } from "../../executionEnvs";
import { newSimpleTable } from "../../table";
import { fetchEventsForReportGenerator } from "../events";

import { getIntersection, groupEventsByUser } from "../utils";

import { buildCohortRetentionChartImageUrl } from "../../charts";
import { Period, PeriodName, PosthogEvent, WaspReport } from "../../types";
import { getActiveUserIds } from "../utils";
import {
  calcLastNPeriods,
  groupEventsByPeriods,
  isEventInPeriod,
} from "./period";

export async function generateCohortRetentionReport(
  numPeriods: number,
  periodName: PeriodName,
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
): Promise<WaspReport[]> {
  // All events, sorted by time (starting with oldest), with events caused by Wasp team members filtered out.
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());
  const { localEvents } = groupEventsByExecutionEnv(events);

  const periods = calcLastNPeriods(numPeriods, periodName);

  // [<active_users_at_period_0>, <active_users_at_period_1>, ...]
  const uniqueActiveUsersByPeriod = groupEventsByPeriods(
    localEvents,
    periods,
  ).map((events) => getActiveUserIds(events));

  const eventsByUser = groupEventsByUser(localEvents);
  const newUniqueUsersByPeriod = periods.map(
    (period) => new Set(findNewUsersForPeriod(eventsByUser, period)),
  );

  const retentionByCohort = generateRetentionByCohort(
    newUniqueUsersByPeriod,
    uniqueActiveUsersByPeriod,
  );

  const periodNameShort = periodName[0];
  const table = newSimpleTable({
    head: ["", ...periods.map((_, i) => `+${i}${periodNameShort}`)],
    rows: retentionByCohort.map((cohort, i) => ({
      [`${periodNameShort} #${i}`]: calcCohortRetentionTableRow(cohort),
    })),
  });

  const series: Record<string, number[]> = {};
  const periodEnds = [];
  for (let i = 0; i < numPeriods; i++) {
    const seriesRetention = [];
    for (const cohortRetention of retentionByCohort) {
      if (cohortRetention.at(i)) {
        seriesRetention.push(cohortRetention[i]);
      }
    }

    series[`w-${i}`] = seriesRetention;
    periodEnds.push(`w #${i}`);
  }

  const fmt = (m) => m.format("DD-MM-YY");
  const firstPeriod = periods[0];
  const lastPeriod = _.last(periods);
  const report = [
    {
      text: [
        "==== Cohort Retention ====",
        "```",
        table.toString(),
        "```",
        `Period of ${periodName}  #0: ${fmt(firstPeriod[0])} - ${fmt(
          firstPeriod[1],
        )}`,
        `Period of ${periodName} #${periods.length - 1}: ${fmt(
          lastPeriod[0],
        )} - ${fmt(lastPeriod[1])}`,
      ],
      chart: buildCohortRetentionChartImageUrl(
        { series, periodEnds },
        `Cohort Retention (per ${periodName})`,
      ),
    },
  ];
  return report;
}

/**
 * Generates a matrix of retention data by cohort.
 * [
 *   [cohort_0_after_0_periods, cohort_0_after_1_period, ...],
 *   [cohort_1_after_0_periods, cohort_1_after_1_period, ...],
 * ]
 * where each value is number of users from that cohort remaining at that period.
 *
 * @param eventsByUser - Record of events grouped by user ID
 * @param periods - List of periods to analyze
 * @param activeUniqueUsersByPeriod - Set of unique active users for each period
 * @returns A matrix where each row represents a cohort and columns represent periods
 */
function generateRetentionByCohort(
  newUniqueUsersByPeriod: Set<string>[],
  activeUniqueUsersByPeriod: Set<string>[],
): number[][] {
  const retentionByCohort: number[][] = [];
  for (let i = 0; i < newUniqueUsersByPeriod.length; i++) {
    const currentCohortRetention: number[] = [];

    currentCohortRetention.push(newUniqueUsersByPeriod[i].size);
    for (let j = i + 1; j < newUniqueUsersByPeriod.length; j++) {
      const users = Array.from(
        getIntersection(
          newUniqueUsersByPeriod[i],
          activeUniqueUsersByPeriod[j],
        ),
      );
      currentCohortRetention.push(users.length);
    }
    retentionByCohort.push(currentCohortRetention);
  }

  return retentionByCohort;
}

/**
 * Finds users who appeared for the first time in a given period.
 *
 * @param eventsByUser - Record of events grouped by user ID
 * @param period - The period to check for new users
 * @returns An array of user IDs who first appeared in the specified period
 */
function findNewUsersForPeriod(
  eventsByUser: Record<string, PosthogEvent[]>,
  period: Period,
) {
  return Object.entries(eventsByUser)
    .filter(([, eventsOfUser]) => isEventInPeriod(eventsOfUser[0], period))
    .map(([userId]) => userId);
}

/**
 * Formats a cohort's retention data for display in a table.
 * @param cohort - Array containing num_users_at_start, num_users_after_1_period, etc.
 * @returns Array of formatted strings with counts and percentages
 *   Examples of returned value:
 *    - `["10", "6 (60%)", "3 (30%)", "0 (0%)"]`
 *    - `["0", "N/A", "N/A"]`
 */
function calcCohortRetentionTableRow(cohort: number[]): string[] {
  const [numUsersAtStart, ...numUsersThroughPeriods] = cohort;
  const retentionPercentages = numUsersThroughPeriods.map((n) =>
    numUsersAtStart === 0
      ? "N/A"
      : `${n} (${Math.round((n / numUsersAtStart) * 100)}%)`,
  );
  return [numUsersAtStart.toString(), ...retentionPercentages];
}
