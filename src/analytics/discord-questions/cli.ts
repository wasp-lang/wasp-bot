import Discord from "discord.js";
import Table from "cli-table";
import { config as dotenvConfig } from "dotenv";
import _ from "lodash";
import moment from "moment";
import logger from "../../utils/logger";
import { QUESTIONS_FORUM_CHANNEL_ID } from "../../discord/server-ids";
import {
  buildAuthorStats,
  fetchRecentThreads,
  ThreadAuthorStats,
} from "./stats";
import { fetchForumChannel } from "../../discord/utils";

dotenvConfig();

async function analyzeDiscordQuestions(): Promise<void> {
  const discordClient = await createAndLoginDiscordClient();
  try {
    const questionsChannel = await fetchForumChannel(
      discordClient,
      QUESTIONS_FORUM_CHANNEL_ID,
    );
    const maxThreadAge = moment().subtract(1, "year");
    const recentThreads = await fetchRecentThreads(
      questionsChannel,
      maxThreadAge,
    );
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

async function createAndLoginDiscordClient(): Promise<Discord.Client> {
  const discordClient = new Discord.Client({
    intents: [
      Discord.GatewayIntentBits.Guilds,
      Discord.GatewayIntentBits.GuildMessages,
      Discord.GatewayIntentBits.GuildMembers,
    ],
  });
  await discordClient.login(process.env.DISCORD_BOT_TOKEN);
  logger.info("Discord client logged in successfully.");
  return discordClient;
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
      ["lastThreadCreatedAt"],
      ["desc"],
    ),
  );
}

analyzeDiscordQuestions().catch((error) => {
  logger.error(error);
  process.exit(1);
});
