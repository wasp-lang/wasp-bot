import Discord from "discord.js";

const INTRODUCTIONS_CHANNEL_ID = "689916376542085170";
const GUEST_ROLE_ID = "812299047175716934";

export function isIntroductionsMessage(message: Discord.Message): boolean {
  return message.channel.id.toString() === INTRODUCTIONS_CHANNEL_ID;
}

export async function handleIntroductionsChannel(
  message: Discord.Message,
): Promise<void> {
  const member = message.guild?.member(message.author);
  if (!member) {
    return;
  }

  // for now we only ever handle guests
  if (!member.roles.cache.get(GUEST_ROLE_ID)) {
    return;
  }

  const trimmedMsg = message.content.trim().length;
  if (trimmedMsg < 20) {
    await message.reply(
      "👋 Great to have you here! Pls introduce yourself with a message that's at least 2️⃣0️⃣ characters long and I will give you full access to the server.",
    );
  }
  try {
    await member.roles.remove(GUEST_ROLE_ID);
    await message.reply(
      "Nice getting to know you ☕️! You now have full access to the Wasp Discord 🐝. Welcome!",
    );
  } catch (error) {
    await message.reply(`Error: ${error}`);
  }
}
