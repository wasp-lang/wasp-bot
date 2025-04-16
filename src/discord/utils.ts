import Discord from "discord.js";

// GUILD = SERVER
const GUILD_ID = "686873244791210014";

export async function fetchTextChannelById(
  discordClient: Discord.Client,
  channelId: Discord.Snowflake,
): Promise<Discord.TextChannel> {
  const guild = await discordClient.guilds.fetch(GUILD_ID);
  const channel = guild.channels.resolve(channelId);

  if (!channel || !(channel instanceof Discord.TextChannel)) {
    throw new Error(`Channel ${channelId} is not a text channel`);
  }

  return channel;
}
