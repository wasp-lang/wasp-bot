import Discord from "discord.js";

const INTRODUCTIONS_CHANNEL_ID = "689916376542085170";
const GUEST_ROLE_ID = "812299047175716934";

export function isIntroductionsMessage(message: Discord.Message): boolean {
  return message.channel.id.toString() === INTRODUCTIONS_CHANNEL_ID;
}

export async function handleIntroductionsChannel(
  message: Discord.Message,
): Promise<void> {
  if (isGuestUser(message)) {
    await handleGuestMessage(message);
  }
}

function isGuestUser(message: Discord.Message): boolean {
  const member = message.guild?.member(message.author);
  return !!member?.roles.cache.get(GUEST_ROLE_ID);
}

async function handleGuestMessage(message: Discord.Message): Promise<void> {
  const trimmedMessageLength = message.content.trim().length;
  if (trimmedMessageLength < 20) {
    await message.reply(
      "👋 Great to have you here! Please introduce yourself with a message that's at least 2️⃣0️⃣ characters long and I will give you full access to the server.",
    );
  }
  try {
    const member = message.guild?.member(message.author);
    await member?.roles.remove(GUEST_ROLE_ID);
    await message.reply(
      "Nice getting to know you ☕️! You now have full access to the Wasp Discord Server 🐝. Welcome!",
    );
  } catch (error) {
    await message.reply(`Error: ${error}`);
  }
}
