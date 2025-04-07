import _ from "lodash";

import { addEventContextValueIfMissing } from "../eventContext";
import { type PosthogEvent, tryToFetchAllCliEvents } from "../events";
import { executionEnvs } from "../executionEnvs";
import moment from "../moment";

/**
 * @returns All Posthog events, sorted by time (starting with oldest), with events caused by Wasp team members
 * filtered out.
 */
export async function fetchEventsForReportGenerator(): Promise<PosthogEvent[]> {
  const allEvents = await tryToFetchAllCliEvents();

  console.log("\nNumber of CLI events fetched:", allEvents.length);

  const waspTeamFilters = [isNotWaspTeamEvent, isNotMihoPrivateCIServerEvent];
  const nonWaspTeamEvents = waspTeamFilters.reduce(
    (events, f) => events.filter(f),
    allEvents,
  );

  const sortedNonWaspTeamEvents = _.sortBy(nonWaspTeamEvents, "timestamp");
  const validEvents = markAsCiEventBurstsFromDifferentUsersFromSameIp(
    sortedNonWaspTeamEvents,
  );

  const sortedValidEvents = _.sortBy(validEvents, "timestamp");

  console.log(
    "unnecessary sorting = ",
    JSON.stringify(validEvents) === JSON.stringify(sortedValidEvents),
  );

  return sortedValidEvents;
}

const waspTeamDistinctUserIds = [
  "bf3fa7a8-1c11-4f82-9542-ec1a2d28786b",
  "53669068-7441-45eb-b11b-880ad4c9c8c2",
  "380cc449-78db-4bd9-ae29-790e892c63a9",
  "7b9d8578-120c-4c2a-b4a7-3994d2801a24",
  "e7cd9e56-2766-4eb6-9e5c-44ecb9014690",
  "8605f02d-5b32-466c-93d2-faaa787f43a0",
  "dc396135-c50d-4064-9563-5813056b1cc8",
  "876c2f9b-853f-4ad2-a63a-c8b178912db5",
  "57591c27-dfe8-46b3-8b46-3f4a14150292",
];

function isNotWaspTeamEvent(event: PosthogEvent) {
  return !waspTeamDistinctUserIds.includes(event.distinct_id);
}

const mihoCIServerIP = "49.12.82.252";
const periodOfMihoCIServerProblematicEvents = [
  moment("2023-11-11T20:00:00.000Z"),
  moment("2023-11-11T23:00:00.000Z"),
];

// Miho set up his own private CI server for his Wasp app but forgot
// to turn off telemetry (+ forgot to set env vars to indicate it is CI)
// so we filtering those out here.
function isNotMihoPrivateCIServerEvent(event: PosthogEvent) {
  return (
    event.properties.$ip === mihoCIServerIP &&
    moment(event.timestamp).isBetween(
      periodOfMihoCIServerProblematicEvents[0],
      periodOfMihoCIServerProblematicEvents[1],
    )
  );
}

/**
 * When building wasp in CI, each build usually starts with a clean disk.
 * While we detect most CI environments in our telemetry, we can't detect 100% of them.
 * In case when we don't, and since they start with a clean disk so user signature that
 * telemetry stores in tmp files does not persist, we get a lot of events where each one
 * looks like it was made by new user (while each one is really just another CI run).
 * What is typical for such situations however is that often such CI server will run from the persistent IP,
 * especially if homecooked (which is normally when we might not recognize it as CI).
 * Therefore, what we do here is detect bursts of events from same IP but from different users
 * and then ensure those events are marked as CI so they don't show as false positive
 * new users.
 *
 * This is not perfect, and we may wrongly mark some valid events this way, for example
 * if multiple people from the same place created Wasp projects (imagine classroom),
 * or if dynamic IP address got switched from one to another Wasp user and they used it
 * one after another, but these are rare cases and for now it seems to work quite well
 * in practice -> it removes those bursts that we detected and doesn't seem to cut the
 * normal looking events too much in general.
 *
 * @param events List of all events, sorted from oldest to newwest.
 * @returns Events from input but some of them newly marked as CI (in their context).
 */
function markAsCiEventBurstsFromDifferentUsersFromSameIp(
  events: PosthogEvent[],
): PosthogEvent[] {
  const lastTimePerIpAndUser = new Map<string, moment.Moment>();
  const lastTimePerIp = new Map<string, moment.Moment>();
  return events.map((event) => {
    const eventIp = event.properties?.$ip;

    if (!eventIp) return event;

    const eventTime = moment(event.timestamp);
    const eventIpAndUser = `${eventIp}:${event.distinct_id}`;

    const areClose = (t1: moment.Moment, t2: moment.Moment): boolean => {
      // NOTE: Why 25 hours? Empirically, we saw this number to remove these problematic
      //   event bursts well. Also, it is just a bit over 24 hours, so if somebody
      //   has daily CI happening every 24 hours, it should catch that also.
      return t1 && t2 && Math.abs(t1.diff(t2, "hours")) < 25;
    };

    const thereIsRecentEventWithSameIpAndUser = areClose(
      eventTime,
      lastTimePerIpAndUser.get(eventIpAndUser),
    );
    const thereIsRecentEventWithSameIp = areClose(
      eventTime,
      lastTimePerIp.get(eventIp),
    );
    const thereAreRecentEventsWithSameIpButNotFromSameUser =
      thereIsRecentEventWithSameIp && !thereIsRecentEventWithSameIpAndUser;

    lastTimePerIp.set(eventIp, eventTime);
    lastTimePerIpAndUser.set(eventIpAndUser, eventTime);

    if (thereAreRecentEventsWithSameIpButNotFromSameUser) {
      return addEventContextValueIfMissing(event, executionEnvs.ci.contextKey);
    } else {
      return event;
    }
  });
}
