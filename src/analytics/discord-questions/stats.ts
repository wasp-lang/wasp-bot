import Discord from "discord.js";
import _ from "lodash";
import moment from "moment";
import logger from "../../utils/logger";
import fs from "fs";

export interface ThreadAuthorStats {
  userId: string;
  username: string;
  threadCount: number;
  firstThreadCreatedAt: Date;
  lastThreadCreatedAt: Date;
}

/*
 * Returns the threads, both active and archived, that are (by creation) not older than
 * maxThreadAge, sorted descending (most recent thread is first, the oldest one is last).
 */
export async function fetchRecentThreads(
  channel: Discord.ForumChannel,
  maxThreadAge: moment.Moment,
): Promise<Discord.ThreadChannel[]> {
  const recentThreads = _.orderBy(
    [
      ...(await fetchRecentActiveThreads(channel, maxThreadAge)),
      ...(await fetchRecentArchivedThreads(channel, maxThreadAge)),
    ],
    ["createdAt"],
    ["desc"],
  );
  logger.info(`Total recent threads: ${recentThreads.length}`);
  return recentThreads;
}

async function fetchRecentActiveThreads(
  channel: Discord.ForumChannel,
  maxThreadAge: moment.Moment,
): Promise<Discord.ThreadChannel[]> {
  const activeThreads = await channel.threads.fetchActive();
  const recentActiveThreads = activeThreads.threads
    .values()
    .filter((t) => wasThreadCreatedBefore(t, maxThreadAge))
    .toArray();
  logger.info(
    `Fetched ${activeThreads.threads.size} active threads (${recentActiveThreads.length} recent)`,
  );
  return recentActiveThreads;
}

async function fetchRecentArchivedThreads(
  channel: Discord.ForumChannel,
  maxThreadAge: moment.Moment,
  beforeThreadId?: string,
): Promise<Discord.ThreadChannel[]> {
  // NOTE: Fetched threads are sorted by archivedAt, not by createdAt, starting with the newest one.
  //   Threads are archived automatically after a period of inactivity, e.g. after 1 week.
  //   Archived threads become un-archived on new activity.
  const fetchedArchivedThreadsPaginated = await channel.threads.fetchArchived({
    before: beforeThreadId,
  });
  const fetchedArchivedThreads = Array.from(
    fetchedArchivedThreadsPaginated.threads.values(),
  );
  if (fetchedArchivedThreads.length == 0) {
    return [];
  }

  const fetchedRecentArchivedThreads = fetchedArchivedThreads.filter((t) =>
    wasThreadCreatedBefore(t, maxThreadAge),
  );

  logger.info(
    `Fetched ${fetchedArchivedThreads.length} archived threads (${fetchedRecentArchivedThreads.length} recent)`,
  );

  const theRestOfRecentArchivedThreads =
    fetchedArchivedThreads.at(-1)!.archivedAt! >= maxThreadAge.toDate() &&
    fetchedArchivedThreadsPaginated.hasMore
      ? await fetchRecentArchivedThreads(
          channel,
          maxThreadAge,
          fetchedArchivedThreadsPaginated.threads.last()?.id,
        )
      : [];

  return [...fetchedRecentArchivedThreads, ...theRestOfRecentArchivedThreads];
}

function wasThreadCreatedBefore(
  thread: Discord.ThreadChannel,
  maxThreadAge: moment.Moment,
): boolean {
  return (
    !!thread.createdTimestamp &&
    thread.createdTimestamp >= maxThreadAge.valueOf()
  );
}

export async function buildAuthorStats(
  discordClient: Discord.Client,
  recentThreads: Discord.ThreadChannel[],
): Promise<ThreadAuthorStats[]> {
  const threadsByAuthor = _.groupBy(recentThreads, (thread) => thread.ownerId);
  const userIdsWithMoreThanOneThread = Object.entries(threadsByAuthor)
    .filter(([, threads]) => threads.length > 1)
    .map(([userId]) => userId);
  const usernamesById = await obtainUsernames(
    discordClient,
    userIdsWithMoreThanOneThread,
  );

  const authorStats = Object.entries(threadsByAuthor).map(
    ([userId, threads]) => {
      const stats = {
        userId,
        username: usernamesById[userId] ?? "?",
        threadCount: threads.length,
        firstThreadCreatedAt: _.minBy(threads, "createdAt")!.createdAt!,
        lastThreadCreatedAt: _.maxBy(threads, "createdAt")!.createdAt!,
      };
      return stats;
    },
  );

  authorStats.sort((a, b) => b.threadCount - a.threadCount);

  return authorStats;
}

async function obtainUsernames(
  discordClient: Discord.Client,
  userIds: string[],
): Promise<Record<string, string>> {
  const cacheFile = "wasp-analytics-discord-usernames-cache.json";

  const usernamesCache: Record<string, string> = fs.existsSync(cacheFile)
    ? JSON.parse(fs.readFileSync(cacheFile, "utf8"))
    : {};
  for (const userId of userIds) {
    if (!(userId in usernamesCache)) {
      usernamesCache[userId] = (
        await discordClient.users.fetch(userId)
      ).username;
      logger.info(`Fetched username for ${userId}: ${usernamesCache[userId]}`);
    }
  }

  fs.writeFileSync(cacheFile, JSON.stringify(usernamesCache, null, 2));
  return usernamesCache;
}
