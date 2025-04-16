import Discord from "discord.js";
import { config as dotenvConfig } from "dotenv";

import { handleMessage } from "./handlers/message";
import { handleMessageUpdate } from "./handlers/message-update";
import { handleReady } from "./handlers/ready";

dotenvConfig();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export function start(): void {
  const discordClient = new Discord.Client({});
  discordClient.login(BOT_TOKEN);

  discordClient.on("ready", async () => await handleReady(discordClient));

  discordClient.on(
    "message",
    async (message) => await handleMessage(discordClient, message),
  );

  discordClient.on(
    "messageUpdate",
    async (oldMessage, newMessage) =>
      await handleMessageUpdate(discordClient, oldMessage, newMessage),
  );
}
