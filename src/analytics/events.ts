import axios from "axios";
import { promises as fs } from "fs";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const POSTHOG_KEY = process.env.WASP_POSTHOG_KEY;
// POSTHOG_PROJECT_API_KEY is public, so it can be here.
const POSTHOG_PROJECT_API_KEY = "CdDd2A0jKTI2vFAsrI9JWm3MqpOcgHz1bMyogAcwsE4";

export async function fetchAllCliEvents() {
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
 */
async function fetchEvents({
  eventType = undefined,
  after = undefined,
  before = undefined,
}) {
  // `token=` here specifies from which project to pull the events from.
  const params = {
    token: POSTHOG_PROJECT_API_KEY,
    ...(eventType && { event: eventType }),
    ...(after && { after }),
    ...(before && { before }),
  };
  const url = `https://app.posthog.com/api/event/?${new URLSearchParams(
    params,
  ).toString()}`;

  console.log("Fetching: " + url);
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
async function loadCachedEvents() {
  try {
    return JSON.parse(await fs.readFile(cachedEventsFilePath, "utf-8"));
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

// Expects events that follow the same rules as the ones returned by `loadCachedEvents()`.
async function saveCachedEvents(events) {
  await fs.writeFile(cachedEventsFilePath, JSON.stringify(events), "utf-8");
}

function getOldestEventTimestampOrNull(events) {
  if (events.length <= 0) return null;
  return events[events.length - 1].timestamp;
}

function getNewestEventTimestampOrNull(events) {
  if (events.length <= 0) return null;
  return events[0].timestamp;
}
