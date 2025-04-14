import Discord from "discord.js";
import { handleAnalyticsMessage, isAnalyticsMessage } from "./analytics";
import {
  handleIntroductionsChannel,
  isIntroductionsMessage,
} from "./introductions";

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
    handleIntroductionsChannel(message);
  } else if (isAnalyticsMessage(message)) {
    handleAnalyticsMessage(discordClient, message);
  }
}

function isDiscordBotMessage(
  discordClient: Discord.Client,
  message: Discord.Message,
) {
  return message.author.id === discordClient.user?.id;
}
