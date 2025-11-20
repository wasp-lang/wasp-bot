import { Moment } from "moment";

import { PosthogEvent } from "../../events";
import moment from "../../../moment";
import { getUniqueUserIds } from "../utils";

export type Period = [Moment, Moment];

export type PeriodName = "day" | "week" | "month";

/**
 * Takes a bunch of events and returns only those that
 * happened in the period specified via (startTime, endTime).
 * @param events - The events to filter
 * @param period - The period to check for activity
 * @returns An array of events that occurred within the specified period
 */
export function filterEventsInPeriod(
  events: PosthogEvent[],
  period: Period,
): PosthogEvent[] {
  return events.filter((e) => isEventInPeriod(e, period));
}

/**
 * Takes a bunch of events and returns only those that
 * happened in the period specified via (startTime, endTime) or before it.
 * @param events - The events to filter
 * @param period - The period to check for activity
 * @returns An array of events that occurred within or before the specified period
 */
export function filterEventsUpToAndInPeriod(
  events: PosthogEvent[],
  period: Period,
): PosthogEvent[] {
  return events.filter((e) => isEventInPeriodOrOlder(e, period));
}

export function isEventInPeriod(event: PosthogEvent, period: Period): boolean {
  return (
    isEventInPeriodOrOlder(event, period) &&
    isEventInPeriodOrNewer(event, period)
  );
}

export function isEventInPeriodOrOlder(
  event: PosthogEvent,
  [, endTime]: Period,
): boolean {
  return moment(event.timestamp).isSameOrBefore(endTime);
}

export function isEventInPeriodOrNewer(
  event: PosthogEvent,
  [startTime]: Period,
): boolean {
  return moment(event.timestamp).isAfter(startTime);
}

/**
 * Calculate the last N complete periods of a specified length.
 * @param numPeriods - The number of periods to calculate
 * @param periodName - The length of each period
 * @returns An array of period ranges, where each period is represented as [startDateTime, endDateTime]
 */
export function calcLastNPeriods(
  numPeriods: number,
  periodName: PeriodName,
): Period[] {
  const startDate = moment()
    .subtract(numPeriods, periodName)
    .startOf(periodName);
  const periods: Period[] = [];
  for (let i = 0; i < numPeriods; i++) {
    periods.push([moment(startDate), moment(startDate).endOf(periodName)]);
    startDate.add(1, periodName).startOf(periodName);
  }
  return periods;
}

/**
 * Both events and periods are expected to be sorted from oldest to newest.
 * If there are N periods, it will return a list with N sublists, where each sublist
 * contains events for a corresponding period.
 * @param events - The events to group, sorted from oldest to newest
 * @param periods - The periods to group by, sorted from oldest to newest
 * @returns An array where each element is a list of events for the corresponding period
 */
export function groupEventsByPeriods(
  events: PosthogEvent[],
  periods: Period[],
): PosthogEvent[][] {
  const eventsByPeriods: PosthogEvent[][] = [];
  const overallStart = periods[0][0];
  const overallEnd = periods[periods.length - 1][1];
  const overallPeriod: Period = [overallStart, overallEnd];

  let currentPeriodIdx = 0;
  let currentPeriodEvents: PosthogEvent[] = [];

  for (const event of events) {
    if (!isEventInPeriod(event, overallPeriod)) {
      continue;
    }
    while (!isEventInPeriod(event, periods[currentPeriodIdx])) {
      eventsByPeriods.push(currentPeriodEvents);
      currentPeriodEvents = [];
      currentPeriodIdx++;
    }
    currentPeriodEvents.push(event);
  }
  eventsByPeriods.push(currentPeriodEvents);

  return eventsByPeriods;
}

/**
 * Based on given events, finds all unique users that were active in the given period
 * and returns their ids.
 * @param events - The events to filter
 * @param period - The period to check for activity
 * @returns An set of unique user IDs
 */
export function getActiveUserIdsInPeriod(
  events: PosthogEvent[],
  period: Period,
): Set<string> {
  return getUniqueUserIds(filterEventsInPeriod(events, period));
}
