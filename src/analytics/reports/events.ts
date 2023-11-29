import * as _ from "lodash";

import moment from "../moment";
import { type PosthogEvent, fetchAllCliEvents } from "../events";

// These filters, when applyed to a list of events, remove
// events that we don't want to go into analysis
// (e.g. because we (Wasp Team) created them).
const validEventFilters = [
  (e) => {
    // These are telemetry user ids of Wasp team members
    // from the situation when we accidentally left telemetry enabled.
    // We track them here so we can ignore these events.
    const ourDistinctIds = [
      "bf3fa7a8-1c11-4f82-9542-ec1a2d28786b",
      "53669068-7441-45eb-b11b-880ad4c9c8c2",
      "380cc449-78db-4bd9-ae29-790e892c63a9",
      "7b9d8578-120c-4c2a-b4a7-3994d2801a24",
      "e7cd9e56-2766-4eb6-9e5c-44ecb9014690",
      "8605f02d-5b32-466c-93d2-faaa787f43a0",
      "dc396135-c50d-4064-9563-5813056b1cc8",
    ];
    return !ourDistinctIds.includes(e.distinct_id);
  },
  (e) => {
    // Miho set up his own private CI server for his Wasp app but forgot
    // to turn off telemetry (+ forgot to set env vars to indicate it is CI)
    // so we filtering those out here.
    const mihoCIServerIP = "49.12.82.252";
    const periodOfProblematicEvents = [
      moment("2023-11-11T20:00:00.000Z"),
      moment("2023-11-11T23:00:00.000Z"),
    ];
    return !(
      e?.properties?.$ip == mihoCIServerIP &&
      moment(e.timestamp).isBetween(
        periodOfProblematicEvents[0],
        periodOfProblematicEvents[1],
      )
    );
  },
];

/**
 * When building wasp in CI, each build usually starts with a clean disk.
 * While we detect most CI environments in our telemetry, we can't detect 100% of them.
 * In case when we don't, and since they start with a clean disk so user signature that
 * telemetry stores in tmp files does not persist, we get a lot of events where each one
 * looks like it was made by new user (while each one is really just another CI run).
 * What is typical for such situations however is that often such CI server will run from the persistent IP,
 * especially if homecooked (which is normally when we might not recognize it as CI).
 * Therefore, what we do here is detect bursts of events from same IP but from different users
 * and then throw those events away so they don't show as false positive new users.
 *
 * This is not perfect, and we may throw away some valid events this way, for example
 * if multiple people from the same place created Wasp projects (imagine classroom),
 * or if dynamic IP address got switched from one to another Wasp user and they used it one after another,
 * but these are rare cases and for now it seems to work quite well in practice -> it removes those
 * bursts that we detected and doesn't seem to cut the normal looking events too much in general.
 *
 * @param events List of all events, sorted from oldest to newwest.
 * @returns Events in the same order as in the input but with filtered out events that are part of "bursts".
 */
function skipEventBurstsFromDifferentUsersFromSameIp(
  events: PosthogEvent[],
): PosthogEvent[] {
  const filteredEvents = [];
  const lastTimePerIpAndUser = new Map<string, moment.Moment>();
  const lastTimePerIp = new Map<string, moment.Moment>();
  events.forEach((event) => {
    let shouldSkip = false;
    const eventIp = event.properties?.$ip;
    const eventTime = moment(event.timestamp);
    if (eventIp) {
      const eventIpAndUser = `${eventIp}:${event.distinct_id}`;

      const areClose = (t1: moment.Moment, t2: moment.Moment): boolean => {
        // NOTE: Why 25 hours? Empirically, we saw this number to remove these problematic
        //   event bursts well. Also, it is just a bit over 24 hours, so if somebody
        //   has daily CI happening every 24 hours, it should catch that also.
        return t1 && t2 && Math.abs(t1.diff(t2, "hours")) < 25;
      };

      const thereIsRecentEventWithSameIpAndUser = areClose(
        eventTime,
        lastTimePerIpAndUser[eventIpAndUser],
      );
      const thereIsRecentEventWithSameIp = areClose(
        eventTime,
        lastTimePerIp[eventIp],
      );
      const thereAreRecentEventsWithSameIpButNotFromSameUser =
        thereIsRecentEventWithSameIp && !thereIsRecentEventWithSameIpAndUser;

      if (thereAreRecentEventsWithSameIpButNotFromSameUser) {
        shouldSkip = true;
      }

      lastTimePerIp[eventIp] = eventTime;
      lastTimePerIpAndUser[eventIpAndUser] = eventTime;
    }
    if (!shouldSkip) {
      filteredEvents.push(event);
    }
  });
  return filteredEvents;
}

export async function fetchEventsForReportGenerator() {
  const allEvents = await fetchAllCliEvents();

  console.log("\nNumber of CLI events fetched:", allEvents.length);

  const allEventsSorted = _.sortBy(allEvents, "timestamp");

  const validEventsSorted = skipEventBurstsFromDifferentUsersFromSameIp(
    validEventFilters.reduce((events, f) => events.filter(f), allEventsSorted),
  );

  return _.sortBy(validEventsSorted, "timestamp");
}
