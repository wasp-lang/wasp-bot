import Discord from "discord.js";
import Table from "cli-table";
import { config as dotenvConfig } from "dotenv";
import _ from "lodash";
import moment from "moment";
import logger from "../../utils/logger";
import { QUESTIONS_FORUM_CHANNEL_ID } from "../../discord/server-ids";

dotenvConfig();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

interface ThreadAuthorStats {
  userId: string;
  username: string;
  threadCount: number;
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
    printResults(authorStats, maxThreadAge);
  } finally {
    await discordClient.destroy();
    logger.info("Discord client disconnected");
  }
}

async function fetchRecentThreads(
  channel: Discord.ForumChannel,
  maxThreadAge: moment.Moment,
) {
  const recentThreads = [
    ...(await fetchRecentActiveThreads(channel, maxThreadAge)),
    ...(await fetchRecentArchivedThreads(channel, maxThreadAge)),
  ];
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
  const threadsByAuthor = _.countBy(recentThreads, (thread) => thread.ownerId);

  logger.info(`Fetching Discord usernames, can take a bit.`);
  const authorStats = await Promise.all(
    Object.entries(threadsByAuthor).map(async ([userId, threadCount]) => ({
      userId,
      username:
        threadCount > 5 ? await fetchUsername(discordClient, userId) : "?",
      threadCount,
    })),
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

/**
 * Fetches username for a given user ID, returning "Unknown User" if fetch fails.
 */
async function fetchUsername(
  discordClient: Discord.Client,
  userId: string,
): Promise<string> {
  try {
    return (await discordClient.users.fetch(userId)).username;
  } catch (error) {
    logger.warn(`Could not fetch user ${userId}: ${error}`);
    return "Unknown User";
  }
}

function printResults(
  authorStats: ThreadAuthorStats[],
  maxThreadAge: moment.Moment,
): void {
  console.log("\n");
  console.log(
    `\x1b[33m=== Questions Forum Thread Authors (since ${maxThreadAge.format("YYYY-MM-DD")}) ===\x1b[0m`,
  );
  console.log("\n");

  const table = new Table({
    head: ["Username", "User ID", "Thread Count"],
    colWidths: [32, 22, 14],
  });

  for (const stats of authorStats) {
    table.push([stats.username, stats.userId, String(stats.threadCount)]);
  }

  console.log(table.toString());

  console.log("\n");
  console.log(`Total authors: ${authorStats.length}`);
  console.log("\n");
}

analyzeQuestionThreads().catch((error) => {
  logger.error(error);
  process.exit(1);
});
