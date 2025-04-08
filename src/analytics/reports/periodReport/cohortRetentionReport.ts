import { Moment } from "moment";
import { PosthogEvent } from "../../events";
import { groupEventsByExecutionEnv } from "../../executionEnvs";
import { createCrossTable, CrossTableData } from "../../table";
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

  /**
   * @param {[number]} cohort [num_users_at_start, num_users_after_1_period, ...]
   * @returns {[string]} [num_users_at_start, num_and_perc_users_after_1_period, ...]
   *   Examples of returned value:
   *    - `["10", "6 (60%)", "3 (30%)", "0 (0%)"]`
   *    - `["0", "N/A", "N/A"]`
   */
  function calcCohortRetentionTableRow(cohort: number[]) {
    const [numUsersAtStart, ...numUsersThroughPeriods] = cohort;
    const retentionPercentages = numUsersThroughPeriods.map((n) =>
      numUsersAtStart === 0
        ? "N/A"
        : `${n} (${Math.round((n / numUsersAtStart) * 100)}%)`,
    );
    return [numUsersAtStart.toString(), ...retentionPercentages];
  }

  const periodNameShort = periodName[0];
  const table = createCrossTable({
    head: ["", ...periods.map((_, i) => `+${i}${periodNameShort}`)],
    rows: cohorts.map((cohort, i) => ({
      [`${periodNameShort} #${i}`]: calcCohortRetentionTableRow(cohort),
    })),
  } satisfies CrossTableData);

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
