import Discord from "discord.js";
import { config as dotenvConfig } from "dotenv";
import _ from "lodash";
import schedule from "node-schedule";

import logger from "../../utils/logger";
import {
  handleAnalyticsMessage,
  isAnalyticsMessage,
  sendAnalyticsReportToReportsChannel,
} from "./analytics";
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

  discordClient.on("ready", _.partial(handleReady, discordClient));
  discordClient.on("message", _.partial(handleMessage, discordClient));
  discordClient.on(
    "messageUpdate",
    _.partial(handleMessageUpdate, discordClient),
  );

  discordClient.login(BOT_TOKEN);
}

export async function handleReady(
  discordClient: Discord.Client,
): Promise<void> {
  logger.info(`Logged in as: ${discordClient.user?.tag}.`);

  // Initiate daily standup every work day at 8:00 am.
  schedule.scheduleJob(
    { dayOfWeek: [1, 2, 3, 4, 5], hour: 8, minute: 0, tz: TIME_ZONE },
    () => initiateDailyStandup(discordClient),
  );

  // Send analytics reports every day at 7:00 am.
  schedule.scheduleJob({ hour: 7, minute: 0, tz: TIME_ZONE }, () =>
    sendAnalyticsReportToReportsChannel(discordClient),
  );
}

export async function handleMessage(
  discordClient: Discord.Client,
  message: Discord.Message,
): Promise<void> {
  if (isOurDiscordBotMessage(discordClient, message)) {
    return;
  }

  if (isIntroductionMessage(message)) {
    await handleIntroductionMessage(message);
  } else if (isAnalyticsMessage(message)) {
    await handleAnalyticsMessage(discordClient, message);
  }
}

function isOurDiscordBotMessage(
  discordClient: Discord.Client,
  message: Discord.Message,
) {
  return message.author.id === discordClient.user?.id;
}

// TODO: Actually handle partial messages.
// For that we first need to enable them in Discord.Client.
// https://github.com/zziger/discord.js-selfbot/blob/master/docs/topics/partials.md
export async function handleMessageUpdate(
  discordClient: Discord.Client,
  _oldMessage: Discord.Message | Discord.PartialMessage,
  newMessage: Discord.Message | Discord.PartialMessage,
): Promise<void> {
  if (!(newMessage instanceof Discord.Message)) {
    return;
  }

  await handleMessage(discordClient, newMessage);
}
