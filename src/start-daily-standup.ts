import { config as dotenvConfig } from "dotenv";

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

(async () => {
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
  console.log(codeBlock.code.rich_text[0].plain_text);
})();

// Print it here.
