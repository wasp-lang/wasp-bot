import Discord from "discord.js";
import {
  handleIntroductionsChannel,
  isIntroductionsMessage,
} from "./introductions";
import { handleAnalyticsMessage, isReportsMessage } from "./reports";

export async function handleMessage(
  discordClient: Discord.Client,
  message: Discord.Message,
): Promise<void> {
  if (isDiscordBotMessage(discordClient, message)) {
    return;
  }

  const member = message.guild?.member(message.author);
  if (!member) {
    return;
  }

  if (isIntroductionsMessage(message)) {
    await handleIntroductionsChannel(message);
  } else if (isReportsMessage(message)) {
    await handleAnalyticsMessage(discordClient, message);
  }
}

function isDiscordBotMessage(
  discordClient: Discord.Client,
  message: Discord.Message,
) {
  return message.author.id === discordClient.user?.id;
}
