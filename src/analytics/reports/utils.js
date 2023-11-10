import * as _ from "lodash";

import moment from "../moment";

/**
 * @param {[PosthogEvent]} events
 * @returns {{ [string]: [PosthogEvent] }} Key is unique project id, value is a list of events that belong to it.
 */
export function groupEventsByProject(events) {
  return _.groupBy(events, (e) => e.distinct_id + e.properties.project_hash);
}

/**
 * @param {[PosthogEvent]} events
 * @returns {{ [string]: [PosthogEvent] }} Key is unique user id, value is a list of events that belong to it.
 */
export function groupEventsByUser(events) {
  return _.groupBy(events, (e) => e.distinct_id);
}

export function getIntersection(setA, setB) {
  return new Set([...setA].filter((element) => setB.has(element)));
}

export function calcUserAgeInDays(newestEvent, oldestEvent) {
  return (
    moment(newestEvent.timestamp).diff(moment(oldestEvent.timestamp), "days") +
    1
  );
}
