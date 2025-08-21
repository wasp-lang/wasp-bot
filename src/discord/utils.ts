import Discord from "discord.js";

export async function fetchTextChannelById(
  discordClient: Discord.Client,
  channelId: Discord.Snowflake,
): Promise<Discord.TextChannel> {
  const channel = await discordClient.channels.fetch(channelId);

  if (!channel) {
    throw new Error(`Channel [${channelId}] not found`);
  }
  if (channel.type !== Discord.ChannelType.GuildText) {
    throw new Error(`Channel [${channelId}] is not a text channel`);
  }

  return channel;
}
