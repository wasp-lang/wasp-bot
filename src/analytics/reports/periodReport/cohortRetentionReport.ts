import _ from "lodash";

import { Moment } from "moment";
import { SimpleReport } from "..";
import { PosthogEvent } from "../../events";
import { groupEventsByExecutionEnv } from "../../executionEnvs";
import { createCrossTable, CrossTableData } from "../../table";
import { fetchEventsForReportGenerator } from "../events";
import {
  getIntersection,
  getUniqueActiveUserIds,
  groupEventsByUser,
} from "../utils";
import {
  calcLastNPeriods,
  groupEventsByPeriods,
  isEventInPeriod,
  Period,
  PeriodName,
} from "./period";

export type CohortRetentionReport = Pick<SimpleReport, "text">;

export async function generateCohortRetentionReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number,
  periodName: PeriodName,
): Promise<CohortRetentionReport> {
  const periodNameShort = periodName[0];

  // All events, sorted by time (starting with oldest), with events caused by Wasp team members
  // filtered out.
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());

  const { localEvents } = groupEventsByExecutionEnv(events);

  const periods = calcLastNPeriods(numPeriods, periodName);

  // [<active_users_at_period_0>, <active_users_at_period_1>, ...]
  const activeUsersSetsByPeriod = groupEventsByPeriods(
    localEvents,
    periods,
  ).map((events) => new Set(getUniqueActiveUserIds(events)));

  const eventsByUser = groupEventsByUser(localEvents);

  // Finds all users that have their first event in the specified period.
  function findNewUsersForPeriod(period: Period) {
    return Object.entries(eventsByUser)
      .filter(([, eventsOfUser]) => isEventInPeriod(eventsOfUser[0], period))
      .map(([userId]) => userId);
  }

  // [
  //   [cohort_0_after_0_periods, cohort_0_after_1_period, ...],
  //   [cohort_1_after_0_periods, cohort_1_after_1_period, ...],
  // ]
  // where each value is number of users from that cohort remaining at that period.
  const cohorts = [];
  for (let i = 0; i < periods.length; i++) {
    const cohort = [];
    const cohortUsersSet = new Set(findNewUsersForPeriod(periods[i]));
    cohort.push(cohortUsersSet.size);
    for (let j = i + 1; j < periods.length; j++) {
      const users = Array.from(
        getIntersection(cohortUsersSet, activeUsersSetsByPeriod[j]),
      );
      cohort.push(users.length);
    }
    cohorts.push(cohort);
  }

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

  const table = createCrossTable({
    head: ["", ...periods.map((_, i) => `+${i}${periodNameShort}`)],
    rows: cohorts.map((cohort, i) => ({
      [`${periodNameShort} #${i}`]: calcCohortRetentionTableRow(cohort),
    })),
  } satisfies CrossTableData);

  const fmt = (m: Moment) => m.format("DD-MM-YY");
  const firstPeriod = periods[0];
  const lastPeriod = _.last(periods);
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
