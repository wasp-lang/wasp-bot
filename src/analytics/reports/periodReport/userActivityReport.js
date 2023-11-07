const _ = require('lodash')

const {
  executionEnvs,
  groupEventsByExecutionEnv,
  showPrettyMetrics,
} = require('../../executionEnvs')
const { fetchEventsForReportGenerator } = require('../../events')
const { buildChartImageUrl } = require('../../charts')

const { elemFromBehind } = require('../utils')

const {
  calcLastNPeriods,
  calcUniqueLocalEventsPerPeriodByAge,
  calcUniqueNonLocalEventsInPeriod
} = require('./common')


async function generateUserActivityReport (numPeriods, periodName, prefetchedEvents = undefined) {
  const events = prefetchedEvents || await fetchEventsForReportGenerator()
  const periods = calcLastNPeriods(numPeriods, periodName)

  const { localEvents, groupedNonLocalEvents } = groupEventsByExecutionEnv(events)

  const uniqueLocalEventsPerPeriodByAge = calcUniqueLocalEventsPerPeriodByAge(localEvents, periods)

  const uniqueNonLocalEventsInPeriod = calcUniqueNonLocalEventsInPeriod(periods, groupedNonLocalEvents);
  const prettyNonLocalMetrics = showPrettyMetrics(uniqueNonLocalEventsInPeriod);

  const report = [ {
    text: [
      'Number of unique active users:',
      `- During last ${periodName}: `
        + _.sum(Object.values(uniqueLocalEventsPerPeriodByAge.series).map(s => elemFromBehind(s, 0))),
      `  - ${prettyNonLocalMetrics}`
    ],
    chart: buildChartImageUrl(
      uniqueLocalEventsPerPeriodByAge,
      `Num unique active users (per ${periodName})`,
      'bars'
    )
  } ]

  return report
}


module.exports = {
  generateUserActivityReport
}
