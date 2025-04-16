import Discord from "discord.js";
import { handleMessage } from "./message";

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
