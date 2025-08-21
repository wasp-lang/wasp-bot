import Discord from "discord.js";

import logger from "../../utils/logger";
import { GUEST_ROLE_ID, INTRODUCTIONS_CHANNEL_ID } from "../server-ids";

export async function isIntroductionMessage(
  message: Discord.GuildMessage,
): Promise<boolean> {
  return (
    isIntroductionsChannel(message.channel) && (await isGuestUser(message))
  );
}

function isIntroductionsChannel(channel: Discord.Channel): boolean {
  return channel.id.toString() === INTRODUCTIONS_CHANNEL_ID;
}

async function isGuestUser(message: Discord.GuildMessage): Promise<boolean> {
  const member = await message.guild.members.fetch(message.author.id);
  return Boolean(member.roles.resolve(GUEST_ROLE_ID));
}

export async function handleIntroductionMessage(
  message: Discord.GuildMessage,
): Promise<void> {
  const trimmedMessageLength = message.content.trim().length;
  if (trimmedMessageLength < 20) {
    await message.reply(
      "👋 Great to have you here! Please introduce yourself with a message that's at least 2️⃣0️⃣ characters long and I will give you full access to the server.",
    );
    return;
  }

  try {
    const member = await message.guild.members.fetch(message.author.id);
    await member.roles.remove(GUEST_ROLE_ID);
    await message.reply(
      "Nice getting to know you ☕️! You now have full access to the Wasp Discord Server 🐝. Welcome!",
    );
  } catch (error) {
    logger.error(error);
    await message.reply(`Error: ${error}`);
  }
}
