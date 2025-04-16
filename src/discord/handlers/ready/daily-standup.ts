import Discord from "discord.js";
import { generateDailyQuote } from "../../quote";
import { fetchTextChannelById } from "../../utils";

const DAILY_STANDUP_CHANNEL_ID = "842082539720146975";

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
