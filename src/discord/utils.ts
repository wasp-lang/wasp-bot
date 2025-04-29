import Discord from "discord.js";

import { GUILD_ID } from "./server-ids";

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
