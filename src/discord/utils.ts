import Discord from "discord.js";

import { GUILD_ID } from "./server-ids";

export function resolveTextChannelById(
  discordClient: Discord.Client,
  channelId: Discord.Snowflake,
): Discord.TextChannel {
  const channel = discordClient.channels.resolve(channelId);

  if (!channel) {
    throw new Error(
      `Bot is not in Channel [${channelId}] of guild [${GUILD_ID}]`,
    );
  }
  if (channel.type !== Discord.ChannelType.GuildText) {
    throw new Error(`Channel [${channelId}] is not a text channel`);
  }

  return channel;
}
