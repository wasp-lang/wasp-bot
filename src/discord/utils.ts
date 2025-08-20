import Discord from "discord.js";

import { GUILD_ID } from "./server-ids";

export function resolveTextChannelById(
  discordClient: Discord.Client,
  channelId: Discord.Snowflake,
): Discord.TextChannel {
  const guild = discordClient.guilds.resolve(GUILD_ID);

  if (!guild) {
    throw new Error(`Bot is not part of Guild [${GUILD_ID}]`);
  }

  const channel = guild.channels.resolve(channelId);

  if (!channel) {
    throw new Error(`Channel [${channelId}] not found in guild [${GUILD_ID}]`);
  }
  if (channel.type !== Discord.ChannelType.GuildText) {
    throw new Error(`Channel [${channelId}] is not a text channel`);
  }

  return channel;
}
