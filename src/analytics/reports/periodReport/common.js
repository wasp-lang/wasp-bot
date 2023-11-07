const moment = require('../../moment')

const { executionEnvs } = require('../../executionEnvs')

const { calcUserAgeInDays, elemFromBehind } = require('../utils')


function calcUniqueNonLocalEventsInPeriod(periods, eventsByEnv) {
  const uniqueNonLocalEventsInPeriod = {};
  for (let envKey of Object.keys(executionEnvs)) {
    const events = eventsByEnv[envKey] || []
    uniqueNonLocalEventsInPeriod[envKey] = uniqueUserIdsInPeriod(events, elemFromBehind(periods, 0)).length
  }
  return uniqueNonLocalEventsInPeriod;
}

// The main metric we are calculating -> for each period, number of unique users, grouped by age (of usage).
// We return it ready for displaying via chart or table.
// Takes list of all events, ends of all periods, and period duration.
function calcUniqueLocalEventsPerPeriodByAge (userEvents, periods) {
  const uniqueLocalEventsPerPeriodByAge = {
    // All series have the same length, which is the length of .periodEnds.
    series: {
      ">30d": [], // [number]
      "(5, 30]d": [],
      "(1, 5]d": [],
      "<=1d": []
    },
    periodEnds: [] // [string] where strings are dates formatted as YY-MM-DD.
  }
  for (let period of periods) {
    const userEventsUpToAndInPeriod = filterEventsUpToAndInPeriod(userEvents, period)
    const ids = uniqueUserIdsInPeriod(userEventsUpToAndInPeriod, period)
    const ages = ids.map(id => calcUserAgeInDays(userEventsUpToAndInPeriod, id))
    uniqueLocalEventsPerPeriodByAge.series["<=1d"].push(ages.filter(age => age <= 1).length)
    uniqueLocalEventsPerPeriodByAge.series["(1, 5]d"].push(ages.filter(age => age > 1 && age <= 5).length)
    uniqueLocalEventsPerPeriodByAge.series["(5, 30]d"].push(ages.filter(age => age > 5 && age <= 30).length)
    uniqueLocalEventsPerPeriodByAge.series[">30d"].push(ages.filter(age => age > 30).length)

    uniqueLocalEventsPerPeriodByAge.periodEnds.push(period[1].format('YY-MM-DD'))
  }
  return uniqueLocalEventsPerPeriodByAge
}

// Takes a bunch of events that have .timestamp field and returns only those that
// happened in the period specified via (startTime, endTime).
function filterEventsInPeriod (events, [startTime, endTime]) {
  return events.filter(e => moment(e.timestamp).isSameOrBefore(endTime) && moment(e.timestamp).isAfter(startTime))
}

// Takes a bunch of events that have .timestamp field and returns only those that
// happened in the period specified via (startTime, endTime) or before it.
function filterEventsUpToAndInPeriod (events, [startTime, endTime]) {
  return events.filter(e => moment(e.timestamp).isSameOrBefore(endTime))
}

// periodName should be 'day', 'week', or 'month'.
// This will return last numPeriods complete periods with the length of periodName.
// Returns: [[periodStartDateTime, periodEndDateTime]].
function calcLastNPeriods (numPeriods, periodName) {
  const startDate = moment().subtract(numPeriods, periodName).startOf(periodName)
  const periods = []
  for (let i = 0; i < numPeriods; i++) {
    periods.push([moment(startDate), moment(startDate).endOf(periodName)])
    startDate.add(1, periodName).startOf(periodName)
  }
  return periods
}

// Based on given events, finds all unique users that were active in the given period
// and returns their ids.
function uniqueUserIdsInPeriod (events, period) {
  return Array.from(new Set(filterEventsInPeriod(events, period).map(e => e.distinct_id)))
}

module.exports = {
  calcUniqueNonLocalEventsInPeriod,
  calcUniqueLocalEventsPerPeriodByAge,
  filterEventsInPeriod,
  filterEventsUpToAndInPeriod,
  calcLastNPeriods,
  uniqueUserIdsInPeriod
}
