import _ from "lodash";

import { PosthogEvent } from "../events";
import moment from "../moment";

/**
 * Groups events by unique project identifier.
 * @param events - The array of PosthogEvent objects to group
 * @returns where key is unique project id (user id + project hash), value is array of events for that project
 */
export function groupEventsByProject(events: PosthogEvent[]): {
  [userAndProjectId: string]: PosthogEvent[];
} {
  return _.groupBy(events, (e) => e.distinct_id + e.properties?.project_hash);
}

/**
 * Groups events by unique user identifier.
 * @param events - The array of PosthogEvent objects to group
 * @returns where key is unique user id, value is array of events for that user
 */
export function groupEventsByUser(events: PosthogEvent[]): {
  [userId: string]: PosthogEvent[];
} {
  return _.groupBy(events, (e) => e.distinct_id);
}

export function calcUserAgeInDays(
  newestEvent: PosthogEvent,
  oldestEvent: PosthogEvent,
): number {
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
export function getUniqueUserIds(events: PosthogEvent[]): Set<string> {
  return new Set(events.map((e) => e.distinct_id));
}
