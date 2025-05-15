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

export function start(): void {
  const discordClient = new Discord.Client({});

  discordClient.on("ready", () => {
    logger.info(`Logged in as: ${discordClient.user?.tag}.`);

    scheduleDailyStandup(discordClient);
    scheduleDailyAnalyticsReport(discordClient);
  });

  discordClient.on("message", handleMessage);
  async function handleMessage(message: Discord.Message): Promise<void> {
    if (isOurDiscordBotMessage(discordClient, message)) {
      return;
    }

    if (isIntroductionMessage(message)) {
      await handleIntroductionMessage(message);
    } else if (isAnalyticsCommand(message)) {
      await handleAnalyticsCommand(discordClient, message);
    }
  }

  discordClient.on("messageUpdate", async (_oldMessage, newMessage) => {
    // TODO: Actually handle partial messages.
    // For that we first need to enable them in Discord.Client.
    // https://github.com/zziger/discord.js-selfbot/blob/master/docs/topics/partials.md
    if (!(newMessage instanceof Discord.Message)) {
      return;
    }

    await handleMessage(newMessage);
  });

  discordClient.login(BOT_TOKEN);
}

function scheduleDailyStandup(discordClient: Discord.Client): void {
  // Initiate daily standup every work day at 8:00 am.
  schedule.scheduleJob(
    { dayOfWeek: [1, 2, 3, 4, 5], hour: 8, minute: 0, tz: TIME_ZONE },
    () => initiateDailyStandup(discordClient),
  );
}

function scheduleDailyAnalyticsReport(discordClient: Discord.Client): void {
  // Send analytics reports every day at 7:00 am.
  schedule.scheduleJob({ hour: 7, minute: 0, tz: TIME_ZONE }, () =>
    sendDailyAnalyticsReport(discordClient),
  );
}

function isOurDiscordBotMessage(
  discordClient: Discord.Client,
  message: Discord.Message,
) {
  return message.author.id === discordClient.user?.id;
}
