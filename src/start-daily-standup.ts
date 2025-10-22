import { config as dotenvConfig } from "dotenv";
import Discord from "discord.js";
import { fetchTextChannelById } from "./discord/utils";
import { DAILY_STANDUP_CHANNEL_ID } from "./discord/server-ids";

import {
  BlockObjectResponse,
  Client,
  CodeBlockObjectResponse,
} from "@notionhq/client";
import logger from "./utils/logger";

dotenvConfig();

// TODO: put this in .env
const NOTION_Q_GOALS_DATABASE_ID = "29418a74-854c-80cd-9fa9-000b086ad833";

logger.info("I'm writing stuff here! Next I will fetch stuff from Notion.");

logger.info(process.env.NOTION_API_KEY);

// Fetch stuff from Notion.
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export async function start(): Promise<void> {
  const discordClient = new Discord.Client({
    // NOTE:
    // If Privileged Gateway Intents are not enabled in the Discord Developer Portal,
    // the bot will throw an error on startup.
    // As of now those are: `Server Members Intent` and `Message Content Intent`
    // See: https://discordjs.guide/popular-topics/intents.html#gateway-intents
    intents: [
      Discord.GatewayIntentBits.Guilds,
      Discord.GatewayIntentBits.GuildMessages,
      Discord.GatewayIntentBits.GuildMembers,
      Discord.GatewayIntentBits.MessageContent,
    ],
  });

  discordClient.on(Discord.Events.ClientReady, async (startedDiscordClient) => {
    logger.info(`Logged in as: ${startedDiscordClient.user.tag}.`);

    const qGoals = await fetchQGoals();

    console.log(qGoals);
    const dailyStandupChannel = await fetchTextChannelById(
      discordClient,
      DAILY_STANDUP_CHANNEL_ID,
    );

    dailyStandupChannel.send(qGoals);
  });

  await discordClient.login(process.env.DISCORD_BOT_TOKEN);
}

const fetchQGoals = async () => {
  const response = await notion.dataSources.query({
    data_source_id: NOTION_Q_GOALS_DATABASE_ID,
    sorts: [
      {
        property: "Date",
        direction: "descending",
      },
    ],
  });

  if (response.results.length === 0) {
    throw "The database does not have any rows!";
  }

  const page = await notion.pages.retrieve({ page_id: response.results[0].id });

  const blocks = await notion.blocks.children.list({
    block_id: page.id,
  });

  if (blocks.results.length === 0) {
    throw "The page must not be empty!";
  }

  const firstBlock = (await notion.blocks.retrieve({
    block_id: blocks.results[0].id,
  })) as BlockObjectResponse;
  if (firstBlock.type !== "code") {
    throw "The page must start with a code section!";
  }

  const codeBlock = firstBlock as CodeBlockObjectResponse;

  return codeBlock.code.rich_text[0].plain_text;
};

start();
