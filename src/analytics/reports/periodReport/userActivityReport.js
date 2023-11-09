const _ = require('lodash')

const { newSimpleTable } = require('../../table')
const {
  executionEnvs,
  groupEventsByExecutionEnv,
  showPrettyMetrics,
} = require('../../executionEnvs')
const { fetchEventsForReportGenerator } = require('../events')
const { buildChartImageUrl } = require('../../charts')

const { calcUserAgeInDays } = require('../utils')

const { calcLastNPeriods, filterEventsUpToAndInPeriod, uniqueUserIdsInPeriod } = require('./common')


async function generateUserActivityReport (numPeriods, periodName, prefetchedEvents = undefined) {
  const events = prefetchedEvents ?? await fetchEventsForReportGenerator()
  const periods = calcLastNPeriods(numPeriods, periodName)

  const { localEvents, groupedNonLocalEvents } = groupEventsByExecutionEnv(events)

  const uniqueLocalActiveUsersPerPeriodByAge = calcNumUniqueActiveUsersPerPeriodByAge(localEvents, periods)

  const uniqueNonLocalActiveUsersInPeriod = calcUniqueNonLocalEventsInPeriod(periods, groupedNonLocalEvents);
  const prettyNonLocalMetrics = showPrettyMetrics(uniqueNonLocalActiveUsersInPeriod);

  const ageRanges = Object.keys(uniqueLocalActiveUsersPerPeriodByAge.series)
  const ageRangesAverages = ageRanges.map((ageRange) => Math.round(_.mean(uniqueLocalActiveUsersPerPeriodByAge.series[ageRange])))
  const tableOfActiveUsersPerPeriodByAge = newSimpleTable({
    head: ["", ...ageRanges, "ALL"],
    rows: [
      ...uniqueLocalActiveUsersPerPeriodByAge.periodEnds.map((periodEnd, i) => {
        const numUsersPerAge = ageRanges.map(ageRange => uniqueLocalActiveUsersPerPeriodByAge.series[ageRange][i])
        return {
          [periodEnd]: [...numUsersPerAge, _.sum(numUsersPerAge)]
        }
      }),
      ["AVG", ...ageRangesAverages, _.sum(ageRangesAverages)]
    ]
  })
  const totalNumOfLocalUsersInLastPeriod = _.sum(
    Object.values(uniqueLocalActiveUsersPerPeriodByAge.series)
      .map(series => _.last(series))
  );

  const report = [{
    text: [
      '==== Unique Active Users ====',
      `During last ${periodName}:`,
      `- Local: ${totalNumOfLocalUsersInLastPeriod}`,
      `- Cloud: ${prettyNonLocalMetrics}`,
      `Table "Num unique active users per ${periodName} by age":`,
      "```",
      tableOfActiveUsersPerPeriodByAge.toString(),
      "```",
    ],
    chart: buildChartImageUrl(
      uniqueLocalActiveUsersPerPeriodByAge,
      `Num unique active users (per ${periodName})`,
      'bars'
    )
  }]

  return report
}

function calcUniqueNonLocalEventsInPeriod(periods, eventsByEnv) {
  const uniqueNonLocalEventsInPeriod = {};
  for (let envKey of Object.keys(executionEnvs)) {
    const events = eventsByEnv[envKey] || []
    uniqueNonLocalEventsInPeriod[envKey] = uniqueUserIdsInPeriod(events, _.last(periods)).length
  }
  return uniqueNonLocalEventsInPeriod;
}

// The main metric we are calculating -> for each period, number of unique users, grouped by age (of usage).
// We return it ready for displaying via chart or table.
// Takes list of all events, ends of all periods, and period duration.
function calcNumUniqueActiveUsersPerPeriodByAge (userEvents, periods) {
  const numUniqueActiveUsersPerPeriodByAge = {
    // All series have the same length, which is the length of .periodEnds.
    series: {
      ">30d": [], // [number]
      "(7, 30]d": [],
      "(1, 7]d": [],
      "<=1d": []
    },
    periodEnds: [] // [string] where strings are dates formatted as YY-MM-DD.
  }
  for (let period of periods) {
    const userEventsUpToAndInPeriod = filterEventsUpToAndInPeriod(userEvents, period)
    const ids = uniqueUserIdsInPeriod(userEventsUpToAndInPeriod, period)
    const ages = ids.map(id => calcUserAgeInDays(userEventsUpToAndInPeriod, id))
    numUniqueActiveUsersPerPeriodByAge.series["<=1d"].push(ages.filter(age => age <= 1).length)
    numUniqueActiveUsersPerPeriodByAge.series["(1, 7]d"].push(ages.filter(age => age > 1 && age <= 7).length)
    numUniqueActiveUsersPerPeriodByAge.series["(7, 30]d"].push(ages.filter(age => age > 7 && age <= 30).length)
    numUniqueActiveUsersPerPeriodByAge.series[">30d"].push(ages.filter(age => age > 30).length)

    numUniqueActiveUsersPerPeriodByAge.periodEnds.push(period[1].format('YY-MM-DD'))
  }
  return numUniqueActiveUsersPerPeriodByAge
}


module.exports = {
  generateUserActivityReport
}
