import Discord from "discord.js";

import logger from "../../utils/logger";
import { INTRODUCTIONS_CHANNEL_ID } from "../channel-ids";

const GUEST_ROLE_ID = "812299047175716934";

export function isIntroductionMessage(message: Discord.Message) {
  return isIntroductionsChannel(message.channel) && isGuestUser(message);
}

function isIntroductionsChannel(channel: Discord.Channel): boolean {
  return channel.id.toString() === INTRODUCTIONS_CHANNEL_ID;
}

function isGuestUser(message: Discord.Message): boolean {
  const member = message.guild?.member(message.author);
  return !!member?.roles.cache.get(GUEST_ROLE_ID);
}

export async function handleIntroductionMessage(
  message: Discord.Message,
): Promise<void> {
  const trimmedMessageLength = message.content.trim().length;
  if (trimmedMessageLength < 20) {
    await message.reply(
      "👋 Great to have you here! Please introduce yourself with a message that's at least 2️⃣0️⃣ characters long and I will give you full access to the server.",
    );
    return;
  }

  try {
    const member = message.guild?.member(message.author);
    await member?.roles.remove(GUEST_ROLE_ID);

    await message.reply(
      "Nice getting to know you ☕️! You now have full access to the Wasp Discord Server 🐝. Welcome!",
    );
  } catch (error) {
    logger.error(error);
    await message.reply(`Error: ${error}`);
  }
}
