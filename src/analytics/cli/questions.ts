import Discord from "discord.js";
import Table from "cli-table";
import { config as dotenvConfig } from "dotenv";
import _ from "lodash";
import moment from "moment";
import logger from "../../utils/logger";
import fs from "fs";
import { QUESTIONS_FORUM_CHANNEL_ID } from "../../discord/server-ids";

dotenvConfig();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

interface ThreadAuthorStats {
  userId: string;
  username: string;
  threadCount: number;
  firstThreadCreatedAt: Date;
  lastThreadCreatedAt: Date;
}

async function analyzeQuestionThreads(): Promise<void> {
  const discordClient = new Discord.Client({
    intents: [
      Discord.GatewayIntentBits.Guilds,
      Discord.GatewayIntentBits.GuildMessages,
      Discord.GatewayIntentBits.GuildMembers,
    ],
  });
  await discordClient.login(BOT_TOKEN);
  logger.info("Discord client logged in successfully.");

  try {
    const channel = await fetchForumChannel(
      discordClient,
      QUESTIONS_FORUM_CHANNEL_ID,
    );
    const maxThreadAge = moment().subtract(1, "year");
    const recentThreads = await fetchRecentThreads(channel, maxThreadAge);
    const authorStats = await buildAuthorStats(discordClient, recentThreads);
    console.log(
      `\n=== All authors (since ${maxThreadAge.format("YYYY-MM-DD")}) ===`,
    );
    printAuthorStats(authorStats);
    console.log("\n=== Authors gone for more than three months ===");
    printGoneAuthorStats(authorStats);
  } finally {
    await discordClient.destroy();
    logger.info("Discord client disconnected");
  }
}

/*
 * Returns the threads, both active and archived, that are (by creation) not older than
 * maxThreadAge, sorted descending (most recent thread is first, the oldest one is last).
 */
async function fetchRecentThreads(
  channel: Discord.ForumChannel,
  maxThreadAge: moment.Moment,
) {
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

async function fetchForumChannel(
  discordClient: Discord.Client,
  channelId: string,
): Promise<Discord.ForumChannel> {
  const channel = await discordClient.channels.fetch(channelId);
  if (!channel || channel.type !== Discord.ChannelType.GuildForum) {
    throw new Error("Channel doesn't exist or is not a forum channel");
  }
  return channel;
}

async function buildAuthorStats(
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

  logger.info(
    `Building the author stats. Can take a bit as fetching Discord usernames is slow.`,
  );
  const authorStats = await Promise.all(
    Object.entries(threadsByAuthor).map(async ([userId, threads]) => {
      const stats = {
        userId,
        username: usernamesById[userId] ?? "?",
        threadCount: threads.length,
        firstThreadCreatedAt: _.minBy(threads, "createdAt")!.createdAt!,
        lastThreadCreatedAt: _.maxBy(threads, "createdAt")!.createdAt!,
      };
      return stats;
    }),
  );

  authorStats.sort((a, b) => b.threadCount - a.threadCount);

  return authorStats;
}

async function fetchRecentActiveThreads(
  channel: Discord.ForumChannel,
  maxThreadAge: moment.Moment,
): Promise<Discord.ThreadChannel[]> {
  const activeThreads = await channel.threads.fetchActive();
  const recentActiveThreads = Array.from(activeThreads.threads.values()).filter(
    (t) => wasThreadCreatedBefore(t, maxThreadAge),
  );
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
    _.last(fetchedArchivedThreads)!.archivedAt! >= maxThreadAge.toDate() &&
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
      usernamesCache[userId] = await fetchUsername(discordClient, userId);
    }
  }
  fs.writeFileSync(cacheFile, JSON.stringify(usernamesCache, null, 2));
  return usernamesCache;
}

/**
 * Fetches username for a given user ID, returning "Unknown User" if fetch fails.
 */
async function fetchUsername(
  discordClient: Discord.Client,
  userId: string,
): Promise<string> {
  try {
    const username = (await discordClient.users.fetch(userId)).username;
    logger.info(`Fetched username for ${userId}: ${username}`);
    return username;
  } catch (error) {
    logger.warn(`Could not fetch user ${userId}: ${error}`);
    return "Unknown User";
  }
}

function printAuthorStats(authorStats: ThreadAuthorStats[]): void {
  const table = new Table({
    head: ["Username", "User ID", "#Threads", "Δt since last"],
    colWidths: [32, 22, 10, 20],
  });
  for (const stats of authorStats.filter((st) => st.threadCount > 1)) {
    table.push([
      stats.username,
      stats.userId,
      String(stats.threadCount),
      moment(stats.lastThreadCreatedAt).fromNow(),
    ]);
  }
  console.log(table.toString());

  console.log(
    `Num authors with just 1 thread: ${authorStats.filter((st) => st.threadCount == 1).length}`,
  );
  console.log(`Total authors: ${authorStats.length}`);
}

function printGoneAuthorStats(authorStats: ThreadAuthorStats[]) {
  const threeMonthsAgo = moment().subtract(3, "months");
  printAuthorStats(
    _.orderBy(
      authorStats.filter((as) =>
        moment(as.lastThreadCreatedAt).isBefore(threeMonthsAgo),
      ),
      ["lastThreadCreatedAt", "threadCount"],
      ["desc", "desc"],
    ),
  );
}

analyzeQuestionThreads().catch((error) => {
  logger.error(error);
  process.exit(1);
});
