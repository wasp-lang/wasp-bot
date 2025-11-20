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

const TIME_ZONE = "Europe/Zagreb";

/**
 * NOTE:
 * To what Discord refers to as "Server" in the application
 * is referred to as "Guild" in the Discord API.
 */

export async function start(): Promise<void> {
  const discordClient = new Discord.Client({
    // NOTE:
    // If Privileged Gateway Intents are not enabled in the Discord Developer Portal,
    // the bot will throw an error on startup.
    // As of now those are: `Server Members Intent` and `Message Content Intent`
    // See: https://discordjs.guide/popular-topics/intents.html#gateway-intents
    intents: [
      Discord.GatewayIntentBits.Guilds,
      Discord.GatewayIntentBits.GuildMessages,
      Discord.GatewayIntentBits.GuildMembers,
      Discord.GatewayIntentBits.MessageContent,
    ],
  });

  discordClient.on(Discord.Events.ClientReady, (startedDiscordClient) => {
    logger.info(`Logged in as: ${startedDiscordClient.user.tag}.`);

    scheduleDailyStandup(startedDiscordClient);
    scheduleDailyAnalyticsReport(startedDiscordClient);
  });
  discordClient.on(Discord.Events.MessageCreate, handleGuildMessage);
  discordClient.on(Discord.Events.MessageUpdate, (_oldMessage, newMessage) =>
    handleGuildMessage(newMessage),
  );

  await discordClient.login(process.env.DISCORD_BOT_TOKEN);
}

async function handleGuildMessage(message: Discord.Message): Promise<void> {
  if (message.author.bot) {
    return;
  }

  // Skip messages sent in the DM channels
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
