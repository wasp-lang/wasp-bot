import * as _ from 'lodash'

import moment from '../../moment'

// Takes a bunch of events that have .timestamp field and returns only those that
// happened in the period specified via (startTime, endTime).
export function filterEventsInPeriod(events, period) {
  return events.filter(e => isEventInPeriod(e, period))
}

// Takes a bunch of events that have .timestamp field and returns only those that
// happened in the period specified via (startTime, endTime) or before it.
export function filterEventsUpToAndInPeriod (events, period) {
  return events.filter(e => isEventInPeriodOrOlder(e, period))
}

export function isEventInPeriodOrOlder (event, [_startTime, endTime]) {
  return moment(event.timestamp).isSameOrBefore(endTime)
}

export function isEventInPeriodOrNewer (event, [startTime, _endTime]) {
  return moment(event.timestamp).isAfter(startTime)
}

export function isEventInPeriod(event, period) {
  return isEventInPeriodOrOlder(event, period) && isEventInPeriodOrNewer(event, period)
}

// periodName should be 'day', 'week', or 'month'.
// This will return last numPeriods complete periods with the length of periodName.
// Returns: [[periodStartDateTime, periodEndDateTime]].
export function calcLastNPeriods (numPeriods, periodName) {
  const startDate = moment().subtract(numPeriods, periodName).startOf(periodName)
  const periods = []
  for (let i = 0; i < numPeriods; i++) {
    periods.push([moment(startDate), moment(startDate).endOf(periodName)])
    startDate.add(1, periodName).startOf(periodName)
  }
  return periods
}

// Takes two arguments, `events` and `periods`.
// Both events and periods are expected to be sorted from oldest to newest.
// If there are N periods, it will return a list with N sublists, where each sublist
// contains events for a corresponding period.
export function groupEventsByPeriods(events, periods) {
  let eventsByPeriods = []
  let currentPeriodIdx = 0
  let currentPeriodEvents = []
  for (const event of events) {
    if (!isEventInPeriod(event, [periods[0][0], _.last(periods)[1]])) {
      continue;
    }
    while (!isEventInPeriod(event, periods[currentPeriodIdx])) {
      eventsByPeriods.push(currentPeriodEvents)
      currentPeriodEvents = []
      currentPeriodIdx++;
    }
    currentPeriodEvents.push(event)
  }
  eventsByPeriods.push(currentPeriodEvents)
  return eventsByPeriods
}

// Based on given events, finds all unique users that were active in the given period
// and returns their ids.
export function getActiveUserIdsInPeriod (events, period) {
  return getActiveUserIds(filterEventsInPeriod(events, period))
}

export function getActiveUserIds (events) {
  return Array.from(new Set(events.map(e => e.distinct_id)))
}
