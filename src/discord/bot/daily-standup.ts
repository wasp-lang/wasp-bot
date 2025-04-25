import Discord from "discord.js";
import { DAILY_STANDUP_CHANNEL_ID } from "../channel-ids";
import { generateDailyQuote } from "../quote";
import { fetchTextChannelById } from "../utils";

export async function initiateDailyStandup(
  discordClient: Discord.Client,
): Promise<void> {
  const dailyStandupChannel = await fetchTextChannelById(
    discordClient,
    DAILY_STANDUP_CHANNEL_ID,
  );

  dailyStandupChannel.send(
    `☀️ Time for daily standup!
    How was your day yesterday, what are you working on today, and what are the challenges you are encountering?
    
    💡 Daily quote: ${generateDailyQuote()}`,
  );
}
