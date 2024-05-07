import axios from "axios";
import { promises as fs } from "fs";
import { config as dotenvConfig } from "dotenv";
import moment from "./moment";

dotenvConfig();

const POSTHOG_KEY = process.env.WASP_POSTHOG_KEY;
// POSTHOG_PROJECT_API_KEY is public, so it can be here.
const POSTHOG_PROJECT_API_KEY = "CdDd2A0jKTI2vFAsrI9JWm3MqpOcgHz1bMyogAcwsE4";

const OLDEST_EVENT_TIMESTAMP = "2021-01-22T19:42:56.684632+00:00";

export interface PosthogEvent {
  distinct_id: string;
  timestamp: Date;
  event?: string;
  properties?: {
    os?: string;
    is_build?: boolean;
    wasp_version?: string;
    project_hash?: string;
    deploy_cmd_args?: string;
    context?: string;
    $ip?: string;
  };
}

export async function fetchAllCliEvents(): Promise<PosthogEvent[]> {
  console.log("Fetching all CLI events...");

  const cachedEvents = (await loadCachedEvents()) ?? [];
  console.log("Number of already locally cached events: ", cachedEvents.length);

  let events = cachedEvents;

  // We fetch any events older than the currently oldest event we already have.
  // If we have no events already, we just start from the newest ones.
  // They are fetched starting with the newest ones and going backwards.
  // We keep fetching them and adding them to the cache as we go, until there are none left.
  console.log("Fetching events older than the cache...");
  let allOldEventsFetched = false;
  while (!allOldEventsFetched) {
    const { isThereMore, events: fetchedEvents } = await fetchEvents({
      eventType: "cli",
      before: getOldestEventTimestampOrNull(events),
    });
    events = [...events, ...fetchedEvents];
    await saveCachedEvents(events);
    allOldEventsFetched = !isThereMore;
  }

  // We fetch any events newer than the currently newest event we already have.
  // They are fetched starting with the newest ones and going backwards.
  // Only once we fetch all of them, we add them to the cache. This is done to guarantee continuity of cached events.
  console.log("Fetching events newer than the cache...");
  let newEvents = [];
  let allNewEventsFetched = false;
  while (!allNewEventsFetched) {
    const { isThereMore, events: fetchedEvents } = await fetchEvents({
      eventType: "cli",
      after: getNewestEventTimestampOrNull(events),
      before: getOldestEventTimestampOrNull(newEvents),
    });
    newEvents = [...newEvents, ...fetchedEvents];
    allNewEventsFetched = !isThereMore;
  }
  events = [...newEvents, ...events];
  await saveCachedEvents(events);

  // NOTE: Sometimes, likely due to rate limiting from PostHog side, `isThereMore` will falsely be
  //   set to `false` even when there is more data. To handle that, we check here if we actually got
  //   all the events, by checking if the oldest event we fetched is indeed old enough.
  const oldestFetchedEventTimestamp = getOldestEventTimestampOrNull(events);
  if (
    oldestFetchedEventTimestamp === null ||
    moment(oldestFetchedEventTimestamp).isAfter(moment(OLDEST_EVENT_TIMESTAMP))
  ) {
    throw new Error(
      "Not all events have been fetched: PostHog likely rate-limited us.",
    );
  }

  console.log("All events fetched!");
  return events;
}

/**
 * Fetches events from PostHog.
 * If there is a lot of events, it will return only a portion of them (the newest ones)
 * and let us know there is more to fetch. This limit is defined by PostHog, but is usually
 * set at 100 events, meaning each fetch will retrieve 100 or less events.
 * To continue fetching the rest of events, you can call fetchEvents() with `before` set to the
 * timestamp of the oldest event that was returned in the previous call to fetchEvents().
 * All of the arguments are optional.
 * If `after` or `before` are not provided, then corresponding restriction on age of events is not set.
 * NOTE: We are using old PostHog API here, and while it works, sometimes it will return `null` for `next`
 *   even though there actually is more data left. So it gives incorrect response in that sense!
 *   When that happens, `isThereMore` will be `false` even though it should be `true`.
 *   This usually happens after we did a fair amount of requests, so it is probably happening because
 *   of the rate limiting from their side, but it manifests in this weird/bad way.
 *   TODO: We should switch to newer API.
 */
async function fetchEvents({
  eventType = undefined,
  after = undefined,
  before = undefined,
}: {
  eventType?: string;
  after?: Date;
  before?: Date;
}): Promise<{ events: PosthogEvent[]; isThereMore: boolean }> {
  // `token=` here specifies from which project to pull the events from.
  const params = {
    token: POSTHOG_PROJECT_API_KEY,
    ...(eventType && { event: eventType }),
    ...(after && { after: after.toString() }),
    ...(before && { before: before.toString() }),
  };
  const url = `https://app.posthog.com/api/event/?${new URLSearchParams(
    params,
  ).toString()}`;

  console.log(`Fetching: ${url}`);
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${POSTHOG_KEY}`,
    },
  });

  const { next, results: events } = response.data;
  return {
    events,
    isThereMore: !!next,
  };
}

// NOTE: This file is gitignored. If you change its name, update it also in gitignore.
const cachedEventsFilePath = "wasp-analytics-cached-events.json";

// Returns: [PosthogEvent]
// where events are guaranteed to be continuous, with no missing events between the cached events.
// Newest event is first (index 0), and oldest event is last, and cached events are continuous,
// in the sense that there is no events between the oldest and newest that is missing.
// There might be missing events before or after though.
async function loadCachedEvents(): Promise<PosthogEvent[]> {
  try {
    return JSON.parse(await fs.readFile(cachedEventsFilePath, "utf-8"));
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

// Expects events that follow the same rules as the ones returned by `loadCachedEvents()`.
async function saveCachedEvents(events: PosthogEvent[]): Promise<void> {
  await fs.writeFile(cachedEventsFilePath, JSON.stringify(events), "utf-8");
}

function getOldestEventTimestampOrNull(events: PosthogEvent[]): Date {
  if (events.length <= 0) return null;
  return events[events.length - 1].timestamp;
}

function getNewestEventTimestampOrNull(events: PosthogEvent[]): Date {
  if (events.length <= 0) return null;
  return events[0].timestamp;
}
