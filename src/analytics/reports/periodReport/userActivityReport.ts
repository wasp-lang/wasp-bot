import _ from "lodash";

import { buildUserActivityReportImageChartsObject } from "../../charts";
import { PosthogEvent } from "../../events";
import {
  EventsByExeuctionEnvironment,
  ExecutionEnvironment,
  executionEnvs,
  groupEventsByExecutionEnv,
  showPrettyMetrics,
} from "../../executionEnvs";
import { newSimpleTable } from "../../table";
import { fetchEventsForReportGenerator } from "../events";
import { calcUserAgeInDays, groupEventsByUser } from "../utils";
import {
  calcLastNPeriods,
  getActiveUserIdsInPeriod,
  groupEventsByPeriods,
  Period,
  PeriodName,
} from "./period";

export async function generateUserActivityReport(
  numPeriods: number,
  periodName: PeriodName,
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
) {
  const events = prefetchedEvents ?? (await fetchEventsForReportGenerator());
  const periods = calcLastNPeriods(numPeriods, periodName);

  const { localEvents, groupedNonLocalEvents } =
    groupEventsByExecutionEnv(events);

  const uniqueLocalActiveUsersPerPeriodByAge = calcNumActiveUsersPerPeriodByAge(
    localEvents,
    periods,
  );

  const uniqueNonLocalActiveUsersInPeriod = calcUniqueNonLocalEventsInPeriod(
    periods,
    groupedNonLocalEvents,
  );
  const prettyNonLocalMetrics = showPrettyMetrics(
    uniqueNonLocalActiveUsersInPeriod,
  );

  const ageRanges = Object.keys(uniqueLocalActiveUsersPerPeriodByAge.series);
  const ageRangesAverages = ageRanges.map((ageRange) =>
    Math.round(_.mean(uniqueLocalActiveUsersPerPeriodByAge.series[ageRange])),
  );

  const tableOfActiveUsersPerPeriodByAgeCsv = [
    ["", ...ageRanges, "ALL"],
    ...uniqueLocalActiveUsersPerPeriodByAge.periodEnds.map((periodEnd, i) => {
      const numUsersPerAge = ageRanges.map(
        (ageRange) => uniqueLocalActiveUsersPerPeriodByAge.series[ageRange][i],
      );
      return [periodEnd, ...numUsersPerAge, _.sum(numUsersPerAge)];
    }),
  ];

  const tableOfActiveUsersPerPeriodByAge = newSimpleTable({
    head: tableOfActiveUsersPerPeriodByAgeCsv[0],
    rows: [
      ...tableOfActiveUsersPerPeriodByAgeCsv
        .slice(1)
        .map(([periodEnd, ...numUsersPerAgeAndSum]) => ({
          [periodEnd]: numUsersPerAgeAndSum,
        })),
      ["AVG", ...ageRangesAverages, _.sum(ageRangesAverages)],
    ],
  });

  const totalNumOfLocalUsersInLastPeriod = _.sum(
    Object.values(uniqueLocalActiveUsersPerPeriodByAge.series).map((series) =>
      _.last(series),
    ),
  );

  const report = {
    text: [
      "==== Unique Active Users ====",
      `During last ${periodName}:`,
      `- Local: ${totalNumOfLocalUsersInLastPeriod}`,
      `- Cloud: ${prettyNonLocalMetrics}`,
      `Table "Num unique active users per ${periodName} by age":`,
      "```",
      tableOfActiveUsersPerPeriodByAge.toString(),
      "```",
    ],
    chart: buildUserActivityReportImageChartsObject(
      uniqueLocalActiveUsersPerPeriodByAge,
      `Num unique active users (per ${periodName})`,
    ),
    csv: tableOfActiveUsersPerPeriodByAgeCsv,
  };

  return report;
}

function calcUniqueNonLocalEventsInPeriod(
  periods: Period[],
  eventsByExecutionEnv: EventsByExeuctionEnvironment,
): Record<ExecutionEnvironment, number> {
  const uniqueNonLocalEventsInPeriod: Record<string, number> = {};

  for (const envKey of Object.keys(
    executionEnvs,
  ) as Array<ExecutionEnvironment>) {
    const events = eventsByExecutionEnv[envKey] ?? [];
    uniqueNonLocalEventsInPeriod[envKey] = getActiveUserIdsInPeriod(
      events,
      _.last(periods),
    ).size;
  }

  return uniqueNonLocalEventsInPeriod as Record<ExecutionEnvironment, number>;
}

/**
 * The main metric we are calculating -> for each period, number of unique users, grouped by age (of usage).
 * We return it ready for displaying via chart or table.
 *
 * @param userEvents - Events data from users to analyze
 * @param periods - Time periods for which to calculate user activity
 * @returns An object containing series data for different age ranges and corresponding period end dates
 */
function calcNumActiveUsersPerPeriodByAge(
  userEvents: PosthogEvent[],
  periods: Period[],
) {
  const numUniqueActiveUsersPerPeriodByAge = {
    // All series have the same length, which is the length of .periodEnds.
    series: {
      ">30d": [], // [number]
      "(7, 30]d": [],
      "(1, 7]d": [],
      "<=1d": [],
    },
    periodEnds: [], // [string] where strings are dates formatted as YY-MM-DD.
  };

  const eventsByPeriods = groupEventsByPeriods(userEvents, periods);
  const eventsByUsers = groupEventsByUser(userEvents);

  for (let periodIdx = 0; periodIdx < periods.length; periodIdx++) {
    const eventsInThisPeriodByUsers = groupEventsByUser(
      eventsByPeriods[periodIdx],
    );
    const ages = Object.entries(eventsInThisPeriodByUsers).map(
      ([userId, eventsInThisPeriodByThisUser]) => {
        const oldestEventEverByThisUser = eventsByUsers[userId][0];
        const newestEventInThisPeriodByThisUser = _.last(
          eventsInThisPeriodByThisUser,
        );
        return calcUserAgeInDays(
          newestEventInThisPeriodByThisUser,
          oldestEventEverByThisUser,
        );
      },
    );

    numUniqueActiveUsersPerPeriodByAge.series["<=1d"].push(
      ages.filter((age) => age <= 1).length,
    );
    numUniqueActiveUsersPerPeriodByAge.series["(1, 7]d"].push(
      ages.filter((age) => age > 1 && age <= 7).length,
    );
    numUniqueActiveUsersPerPeriodByAge.series["(7, 30]d"].push(
      ages.filter((age) => age > 7 && age <= 30).length,
    );
    numUniqueActiveUsersPerPeriodByAge.series[">30d"].push(
      ages.filter((age) => age > 30).length,
    );

    numUniqueActiveUsersPerPeriodByAge.periodEnds.push(
      periods[periodIdx][1].format("YY-MM-DD"),
    );
  }
  return numUniqueActiveUsersPerPeriodByAge;
}
