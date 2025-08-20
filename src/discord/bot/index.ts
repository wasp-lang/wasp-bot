import Discord from "discord.js";
import { config as dotenvConfig } from "dotenv";
import schedule from "node-schedule";

import logger from "../../utils/logger";
import {
  handleAnalyticsCommand,
  isAnalyticsCommand,
} from "./analytics/commands";
import { sendDailyAnalyticsReport } from "./analytics/daily-report";
import { initiateDailyStandup } from "./daily-standup";
import {
  handleIntroductionMessage,
  isIntroductionMessage,
} from "./introduction";

dotenvConfig();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const TIME_ZONE = "Europe/Zagreb";

export async function start(): Promise<void> {
  const discordClient = new Discord.Client({
    intents: [
      Discord.GatewayIntentBits.Guilds,
      Discord.GatewayIntentBits.GuildMessages,
      Discord.GatewayIntentBits.GuildMembers,
      Discord.GatewayIntentBits.MessageContent,
    ],
  });

  discordClient.on(Discord.Events.ClientReady, (discordClient) => {
    logger.info(`Logged in as: ${discordClient.user.tag}.`);

    scheduleDailyStandup(discordClient);
    scheduleDailyAnalyticsReport(discordClient);
  });
  discordClient.on(Discord.Events.MessageCreate, handleGuildMessage);
  discordClient.on(Discord.Events.MessageUpdate, (_oldMessage, newMessage) =>
    handleGuildMessage(newMessage),
  );

  await discordClient.login(BOT_TOKEN);
}

async function handleGuildMessage(message: Discord.Message): Promise<void> {
  if (message.author.bot) {
    return;
  }

  if (!message.inGuild()) {
    return;
  }

  if (await isIntroductionMessage(message)) {
    await handleIntroductionMessage(message);
  } else if (isAnalyticsCommand(message)) {
    await handleAnalyticsCommand(message);
  }
}

/**
 * Schedules daily standup every work day (Mon-Fri) at 8:00 am.
 */
function scheduleDailyStandup(discordClient: Discord.Client): void {
  schedule.scheduleJob(
    { dayOfWeek: [1, 2, 3, 4, 5], hour: 8, minute: 0, tz: TIME_ZONE },
    () => initiateDailyStandup(discordClient),
  );
}

/**
 * Schedules daily analytics report every day at 7:00 am.
 */
function scheduleDailyAnalyticsReport(discordClient: Discord.Client): void {
  schedule.scheduleJob({ hour: 7, minute: 0, tz: TIME_ZONE }, () =>
    sendDailyAnalyticsReport(discordClient),
  );
}
