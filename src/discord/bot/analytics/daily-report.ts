import Discord from "discord.js";
import moment from "moment";

import { fetchEventsForReportGenerator } from "../../../analytics/wasp-cli-usage/reports";
import logger from "../../../utils/logger";
import { REPORTS_CHANNEL_ID } from "../../server-ids";
import { fetchTextChannel } from "../../utils";
import { sendAnalyticsReportToReportsChannel } from "./common";

export async function sendDailyAnalyticsReport(
  discordClient: Discord.Client,
): Promise<void> {
  const reportsChannel = await fetchTextChannel(
    discordClient,
    REPORTS_CHANNEL_ID,
  );

  await reportsChannel.send(
    "📊 What time is it? It is time for daily analytics report!",
  );
  await reportsChannel.send("⏳ Fetching analytics events...");

  try {
    // By prefetching events, we can reuse them for all reports.
    const events = await fetchEventsForReportGenerator();

    await sendAnalyticsReportToReportsChannel(discordClient, "total", events);
    await sendAnalyticsReportToReportsChannel(discordClient, "daily", events);

    if (isFirstDayOfWeek()) {
      await sendAnalyticsReportToReportsChannel(
        discordClient,
        "weekly",
        events,
      );
    }
    if (isFirstDayOfMonth()) {
      await sendAnalyticsReportToReportsChannel(
        discordClient,
        "monthly",
        events,
      );
    }
  } catch (error) {
    logger.error(error);
    await reportsChannel.send(
      `Failed to send daily analytics report: "${error}"

      Check the logs for more details:
      https://fly-metrics.net/d/fly-logs/fly-logs?orgId=273532&var-app=wasp-bot`,
    );
  }
}

function isFirstDayOfWeek(): boolean {
  return moment().isoWeekday() === 1;
}

function isFirstDayOfMonth(): boolean {
  return moment().date() === 1;
}
