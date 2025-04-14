import _ from "lodash";

import { ChartData, createUserActivityReportChart } from "../../charts";
import { PosthogEvent } from "../../events";
import {
  EventsByExecutionEnvironment,
  ExecutionEnvironment,
  executionEnvs,
  groupEventsByExecutionEnv,
  showPrettyMetrics,
} from "../../executionEnvs";
import { createCrossTable } from "../../table";
import { fetchEventsForReportGenerator } from "../events";
import { UserActivityReport } from "../reports";
import { calcUserAgeInDays, groupEventsByUser } from "../utils";
import {
  calcLastNPeriods,
  getActiveUserIdsInPeriod,
  groupEventsByPeriods,
  Period,
  PeriodName,
} from "./period";

export async function generateUserActivityReport(
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number,
  periodName: PeriodName,
): Promise<UserActivityReport> {
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

  const activeUsersperPeriodByAgeHeaders = ["", ...ageRanges, "ALL"];
  const activeUsersPerPeriodByAgeCsvData = [
    ...uniqueLocalActiveUsersPerPeriodByAge.periodEnds.map((periodEnd, i) => {
      const numUsersPerAge = ageRanges.map(
        (ageRange) => uniqueLocalActiveUsersPerPeriodByAge.series[ageRange][i],
      );
      return [periodEnd, ...numUsersPerAge, _.sum(numUsersPerAge)];
    }),
  ];

  const tableOfActiveUsersPerPeriodByAge = createCrossTable({
    head: activeUsersperPeriodByAgeHeaders as ["", ...string[]],
    rows: [
      ...activeUsersPerPeriodByAgeCsvData.map(
        ([periodEnd, ...numUsersPerAgeAndSum]) => ({
          [periodEnd]: numUsersPerAgeAndSum.map((num) => num.toString()),
        }),
      ),
      {
        AVG: [
          ...ageRangesAverages.map((num) => num.toString()),
          _.sum(ageRangesAverages).toString(),
        ],
      },
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
    chart: createUserActivityReportChart(
      uniqueLocalActiveUsersPerPeriodByAge,
      `Num unique active users (per ${periodName})`,
    ),
    csv: [
      activeUsersperPeriodByAgeHeaders,
      ...activeUsersPerPeriodByAgeCsvData,
    ],
  };

  return report;
}

function calcUniqueNonLocalEventsInPeriod(
  periods: Period[],
  eventsByExecutionEnv: EventsByExecutionEnvironment,
): Record<ExecutionEnvironment, number> {
  const uniqueNonLocalEventsInPeriod: Record<string, number> = {};

  for (const envKey of Object.keys(executionEnvs) as ExecutionEnvironment[]) {
    const events = eventsByExecutionEnv[envKey] ?? [];
    uniqueNonLocalEventsInPeriod[envKey] = getActiveUserIdsInPeriod(
      events,
      periods.at(-1)!,
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
): ChartData {
  const numUniqueActiveUsersPerPeriodByAge: ChartData = {
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
        const newestEventInThisPeriodByThisUser =
          eventsInThisPeriodByThisUser.at(-1)!;
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
