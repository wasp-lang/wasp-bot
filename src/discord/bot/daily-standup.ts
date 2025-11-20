import Discord from "discord.js";
import InspirationalQuotes from "inspirational-quotes";
import _ from "lodash";

import logger from "../../utils/logger";
import { DAILY_STANDUP_CHANNEL_ID } from "../server-ids";
import { fetchTextChannel } from "../utils";

export async function initiateDailyStandup(
  discordClient: Discord.Client,
): Promise<void> {
  logger.info(`Initiating daily standup...`);
  const dailyStandupChannel = await fetchTextChannel(
    discordClient,
    DAILY_STANDUP_CHANNEL_ID,
  );

  dailyStandupChannel.send(
    `☀️ Time for daily standup!
    How was your day yesterday, what are you working on today, and what are the challenges you are encountering?
    
    💡 Daily quote: ${generateDailyQuote()}`,
  );
}

interface Quote {
  text: string;
  author: string;
}

function generateDailyQuote(): string {
  const wisdomQuote: Quote = InspirationalQuotes.getQuote();
  const waspQuote = _.sample(WASP_QUOTES)!;
  const quote = Math.random() < 0.1 ? waspQuote : wisdomQuote;

  return `${quote.text} | ${quote.author}`;
}

const WASP_QUOTES: Quote[] = [
  {
    text: "No hour of life is wasted that is spent in the saddle.",
    author: "Vince",
  },
  {
    text: "Food nourishes the body, but meetings nourish the soul.",
    author: "Filip",
  },
  { text: "Shirt is just a social construct.", author: "Miho" },
  {
    text: "Don't be too dogmatic, unless we're talking about Dogma the beer brewery.",
    author: "Milica, wannabe home brewer",
  },
  {
    text: "Let's send them some swag! Martin will take care of it.",
    author: "Matija",
  },
  {
    text: "I don't have time to review PRs but it seems I do have time to implement these silly quotes.",
    author: "Martin",
  },
];
