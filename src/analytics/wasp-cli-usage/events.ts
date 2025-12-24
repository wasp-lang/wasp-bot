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
const POSTHOG_TIMESTAMP_FORMAT = "YYYY-MM-DDTHH:mm:ss.SSSSSSZ";
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
 * PosthogEvent type which is JSON friendly.
 * Used when reading/writing the events in JSON format.
 */
type RawPosthogEvent = Omit<PosthogEvent, "timestamp"> & { timestamp: string };

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

  const events = await loadCachedEvents();
  logger.info("Number of already locally cached events: ", events.length);

  // We fetch any events older than the currently oldest event we already have.
  // If we have no events already, we just start from the newest ones.
  // They are fetched starting with the newest ones and going backwards.
  // We keep fetching them and adding them to the cache as we go, until there are none left.
  logger.info("Fetching events older than the cache...");
  let allOldEventsFetched = false;
  while (!allOldEventsFetched) {
    const { isThereMore, rawEvents: fetchedRawEvents } = await fetchEvents({
      eventType: "cli",
      before: getOldestEventTimestamp(events),
    });

    events.push(...fetchedRawEvents.map(toPosthogEvent));
    await saveCachedEvents(events);

    allOldEventsFetched = !isThereMore;
  }

  // We fetch any events newer than the currently newest event we already have.
  // As PostHog always returns newest possible events in the given time interval,
  // and we want to fetch newer events incrementally (to save the progress),
  // we fetch the events in incremental time interval batches.
  //
  // We create the time intrval by adding time (e.g. 6 hours) to the current newest event.
  // We fetch events in those intervals starting from newest, and moving towards
  // older ones by increasing the current `offset`.
  //
  //                          current batch time interval
  //                       after -> |<--------->| <- before
  // [##############################|----<<#####|--------------------------]
  // fetched events                        |<-->|         unfetched events
  //                                 current batch offset
  logger.info("Fetching events newer than the cache...");
  let lastFetchHadEvents = true;
  let currentBatchMaxDate = new Date(0);
  const currentDate = new Date();
  while (lastFetchHadEvents || currentBatchMaxDate < currentDate) {
    let currentBatchAllEventsFetched = false;
    let currentBatchOffset = 0;
    const currentBatchEvents = [];
    currentBatchMaxDate = moment(getNewestEventTimestamp(events))
      .add(6, "hours")
      .toDate();

    while (!currentBatchAllEventsFetched) {
      const { isThereMore, rawEvents: fetchedRawEvents } = await fetchEvents({
        eventType: "cli",
        after: getNewestEventTimestamp(events),
        before: currentBatchMaxDate,
        offset: currentBatchOffset,
      });
      currentBatchEvents.push(...fetchedRawEvents.map(toPosthogEvent));

      lastFetchHadEvents = fetchedRawEvents.length !== 0;
      currentBatchOffset += fetchedRawEvents.length;
      currentBatchAllEventsFetched = !isThereMore;
    }

    logger.debug(`Fetched ${currentBatchEvents.length} events in batch`);
    events.unshift(...currentBatchEvents);
    await saveCachedEvents(events);
  }

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
 * Loads cached PostHog events from a JSON file.
 *
 * @returns An array of PostHog events where:
 *   - Events are guaranteed to be continuous, with no missing events between the cached events.
 *   - Newest event is first (index 0), and oldest event is last.
 *   - There might be missing events before or after the cached range.
 */
async function loadCachedEvents(): Promise<PosthogEvent[]> {
  try {
    const rawCache = await fs.readFile(CACHE_FILE_PATH, "utf-8");
    return JSON.parse(rawCache, (key, value) => {
      if (key === "timestamp") {
        return new Date(value);
      }
      return value;
    }) as PosthogEvent[];
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
  logger.debug(`Saving a new cache with ${events.length} events.`);
  await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(events), "utf-8");
}

/**
 * Fetches events from PostHog.
 * PostHog always returns the newest events in the given constrainsts.
 * If there is a lot of events (more than 100), it will return
 * only a portion of them and let us know if there is more to fetch.
 * In short, each fetch will retrieve 100 or less events.
 *
 * To fetch something other than nevewest events:
 *   1. You can use `before` and `after` to set the time interval of events you want to fetch.
 *   2. You can use `offset` to skip a number of events in the currently selected time interval.
 *      Meaning that PostHog will skip `offset` number of newest events and return older ones.
 *
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
  offset = undefined,
}: {
  eventType?: string;
  after?: Date;
  before?: Date;
  offset?: number;
}): Promise<{ rawEvents: RawPosthogEvent[]; isThereMore: boolean }> {
  // `token=` here specifies from which project to pull the events from.
  const params = {
    token: POSTHOG_PROJECT_API_KEY,
    ...(eventType && { event: eventType }),
    ...(after && {
      after: moment(after).format(POSTHOG_TIMESTAMP_FORMAT),
    }),
    ...(before && {
      before: moment(before).format(POSTHOG_TIMESTAMP_FORMAT),
    }),
    ...(offset && { offset: offset.toString() }),
  };
  const url = `https://app.posthog.com/api/event/?${new URLSearchParams(
    params,
  ).toString()}`;

  logger.info(`Fetching: ${url}`);
  const response = await axios.get<{
    next: boolean;
    results: RawPosthogEvent[];
  }>(url, {
    headers: {
      Authorization: `Bearer ${POSTHOG_KEY}`,
    },
  });
  logger.debug(`Fetched ${response.data.results.length} events`);

  const { next, results: events } = response.data;
  return {
    rawEvents: events,
    isThereMore: !!next,
  };
}

function toPosthogEvent(rawPosthogEvent: RawPosthogEvent): PosthogEvent {
  let properties: PosthogEvent["properties"];
  if (rawPosthogEvent.properties) {
    properties = {
      os: rawPosthogEvent.properties.os,
      is_build: rawPosthogEvent.properties.is_build,
      wasp_version: rawPosthogEvent.properties.wasp_version,
      project_hash: rawPosthogEvent.properties.project_hash,
      deploy_cmd_args: rawPosthogEvent.properties.deploy_cmd_args,
      context: rawPosthogEvent.properties.context,
      $ip: rawPosthogEvent.properties.$ip,
    };
  }

  return {
    distinct_id: rawPosthogEvent.distinct_id,
    timestamp: new Date(rawPosthogEvent.timestamp),
    event: rawPosthogEvent.event,
    properties,
  };
}

function getOldestEventTimestamp(events: PosthogEvent[]): Date | undefined {
  return events.at(-1)?.timestamp;
}

function getNewestEventTimestamp(events: PosthogEvent[]): Date | undefined {
  return events.at(0)?.timestamp;
}
