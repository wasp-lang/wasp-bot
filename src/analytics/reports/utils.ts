import _ from "lodash";

import moment from "../moment";
import { PosthogEvent } from "../types";

/**
 * @returns {Record<string, PosthogEvent[]>} Key is unique project id, value is a list of events that belong to it.
 */
export function groupEventsByProject(
  events: PosthogEvent[],
): Record<string, PosthogEvent[]> {
  return _.groupBy(events, (e) => e.distinct_id + e.properties.project_hash);
}

/**
 * @returns {Record<string, PosthogEvent[]>} Key is unique user id, value is a list of events that belong to it.
 */
export function groupEventsByUser(
  events: PosthogEvent[],
): Record<string, PosthogEvent[]> {
  return _.groupBy(events, (e) => e.distinct_id);
}

export function getIntersection<T>(setA: Set<T>, setB: Set<T>) {
  return new Set([...setA].filter((element) => setB.has(element)));
}

export function calcUserAgeInDays(
  newestEvent: PosthogEvent,
  oldestEvent: PosthogEvent,
) {
  return (
    moment(newestEvent.timestamp).diff(moment(oldestEvent.timestamp), "days") +
    1
  );
}

/**
 * Extracts unique user IDs from a list of events.
 * @param events - The events to extract user IDs from
 * @returns An Set of unique user IDs
 */
export function getActiveUserIds(events: PosthogEvent[]): Set<string> {
  return new Set(events.map((e) => e.distinct_id));
}
