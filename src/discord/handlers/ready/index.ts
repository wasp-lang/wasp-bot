import Discord from "discord.js";
import schedule from "node-schedule";
import logger from "../../../utils/logger";
import { initiateAnalyticsReport } from "./analytics-report";
import { initiateDailyStandup } from "./daily-standup";

const timezone = "Europe/Zagreb";

export async function handleReady(
  discordClient: Discord.Client,
): Promise<void> {
  logger.info(`Logged in as: ${discordClient.user?.tag}.`);

  // Initiate daily standup every day at 8:00.
  schedule.scheduleJob(
    { dayOfWeek: [1, 2, 3, 4, 5], hour: 8, minute: 0, tz: timezone },
    async () => await initiateDailyStandup(discordClient),
  );

  // Every day at 7:00 am, send analytics reports.
  schedule.scheduleJob(
    { hour: 7, minute: 0, tz: timezone },
    async () => await initiateAnalyticsReport(discordClient),
  );
}
