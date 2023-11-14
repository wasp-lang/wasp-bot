const moment = require('../../moment')

// Takes a bunch of events that have .timestamp field and returns only those that
// happened in the period specified via (startTime, endTime).
function filterEventsInPeriod (events, [startTime, endTime]) {
  return events.filter(e => moment(e.timestamp).isSameOrBefore(endTime) && moment(e.timestamp).isAfter(startTime))
}

// Takes a bunch of events that have .timestamp field and returns only those that
// happened in the period specified via (startTime, endTime) or before it.
function filterEventsUpToAndInPeriod (events, [_startTime, endTime]) {
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
  filterEventsInPeriod,
  filterEventsUpToAndInPeriod,
  calcLastNPeriods,
  uniqueUserIdsInPeriod
}
