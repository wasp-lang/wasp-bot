import retry from "async-retry";
import axios from "axios";
import { config as dotenvConfig } from "dotenv";
import { promises as fs } from "fs";
import logger from "../../utils/logger";
import moment from "../moment";

dotenvConfig();

const POSTHOG_KEY = process.env.WASP_POSTHOG_KEY;
// POSTHOG_PROJECT_API_KEY is public, so it can be here.
const POSTHOG_PROJECT_API_KEY = "CdDd2A0jKTI2vFAsrI9JWm3MqpOcgHz1bMyogAcwsE4";
const OLDEST_EVENT_TIMESTAMP = "2021-01-22T19:42:56.684632+00:00";
const CACHE_FILE_PATH =
  process.env.WASP_ANALYTICS_CACHED_EVENTS_JSON_PATH ??
  "./wasp-analytics-cached-events.json";

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

/**
 * Tries to fetch all CLI events from Posthog, retrying in case of failure.
 * It caches the fetched events, so each retry continues from where it left off.
 */
export async function tryToFetchAllCliEvents(): Promise<PosthogEvent[]> {
  return await retry(
    async () => {
      return fetchAllCliEvents();
    },
    {
      retries: 10,
      minTimeout: 5 * 1000,
      maxTimeout: 120 * 1000,
      onRetry: (error: Error) => {
        logger.error(error);
        logger.error(
          "Error happened while fetching events for report generator, trying again...",
        );
      },
    },
  );
}

async function fetchAllCliEvents(): Promise<PosthogEvent[]> {
  logger.info("Fetching all CLI events...");

  const cachedEvents = await loadCachedEvents();
  logger.info("Number of already locally cached events: ", cachedEvents.length);

  let events = cachedEvents;

  // We fetch any events older than the currently oldest event we already have.
  // If we have no events already, we just start from the newest ones.
  // They are fetched starting with the newest ones and going backwards.
  // We keep fetching them and adding them to the cache as we go, until there are none left.
  logger.info("Fetching events older than the cache...");
  let allOldEventsFetched = false;
  while (!allOldEventsFetched) {
    const { isThereMore, events: fetchedEvents } = await fetchEvents({
      eventType: "cli",
      before: getOldestEventTimestamp(events),
    });
    events = [...events, ...fetchedEvents];
    await saveCachedEvents(events);
    allOldEventsFetched = !isThereMore;
  }

  // We fetch any events newer than the currently newest event we already have.
  // They are fetched starting with the newest ones and going backwards.
  // Only once we fetch all of them, we add them to the cache. This is done to guarantee continuity of cached events.
  logger.info("Fetching events newer than the cache...");
  let newEvents: PosthogEvent[] = [];
  let allNewEventsFetched = false;
  while (!allNewEventsFetched) {
    const { isThereMore, events: fetchedEvents } = await fetchEvents({
      eventType: "cli",
      after: getNewestEventTimestamp(events),
      before: getOldestEventTimestamp(newEvents),
    });
    newEvents = [...newEvents, ...fetchedEvents];
    allNewEventsFetched = !isThereMore;
  }
  events = [...newEvents, ...events];
  await saveCachedEvents(events);

  // NOTE: Sometimes, likely due to rate limiting from PostHog side, `isThereMore` will falsely be
  //   set to `false` even when there is more data. To handle that, we check here if we actually got
  //   all the events, by checking if the oldest event we fetched is indeed old enough.
  const oldestFetchedEventTimestamp = getOldestEventTimestamp(events);
  const didWeFetchAllOldEvents =
    !!oldestFetchedEventTimestamp &&
    moment(oldestFetchedEventTimestamp).isSameOrBefore(
      moment(OLDEST_EVENT_TIMESTAMP),
    );
  if (!didWeFetchAllOldEvents) {
    throw new Error(
      "Not all events have been fetched: PostHog likely rate-limited us.",
    );
  }

  logger.info("All events fetched!");
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

  logger.info(`Fetching: ${url}`);
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

/**
 * Loads cached PostHog events from a JSON file.
 *
 * @returns An array of PostHog events where:
 *   - Events are guaranteed to be continuous, with no missing events between the cached events
 *   - Newest event is first (index 0), and oldest event is last
 *   - No events are missing between the oldest and newest cached events
 *   - There might be missing events before or after the cached range
 */
async function loadCachedEvents(): Promise<PosthogEvent[]> {
  try {
    const cacheFileContent = await fs.readFile(CACHE_FILE_PATH, "utf-8");
    return JSON.parse(cacheFileContent);
  } catch (error: unknown) {
    logger.warn(error);
    logger.warn("Failed to read the cache file.");
    return [];
  }
}

/**
 * Expects events that follow the same rules as the ones returned by `loadCachedEvents()`.
 */
async function saveCachedEvents(events: PosthogEvent[]): Promise<void> {
  await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(events), "utf-8");
}

function getOldestEventTimestamp(events: PosthogEvent[]): Date | undefined {
  return events.at(-1)?.timestamp;
}

function getNewestEventTimestamp(events: PosthogEvent[]): Date | undefined {
  return events.at(0)?.timestamp;
}
