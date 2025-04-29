import Discord from "discord.js";

import moment from "moment";
import { getAnalyticsErrorMessage } from "../../../analytics/errors";
import { fetchEventsForReportGenerator } from "../../../analytics/reports";
import logger from "../../../utils/logger";
import { REPORTS_CHANNEL_ID } from "../../channel-ids";
import { fetchTextChannelById } from "../../utils";
import { sendAnalyticsReportToReportsChannel } from "./common";

export async function sendDailyAnalyticsReport(
  discordClient: Discord.Client,
): Promise<void> {
  const reportsChannel = await fetchTextChannelById(
    discordClient,
    REPORTS_CHANNEL_ID,
  );

  await reportsChannel.send(
    "📊 What time is it? It is time for daily analytics report!",
  );
  await reportsChannel.send("⏳ Fetching analytics events...");

  try {
    // By prefetching events, we can reuse them for all reports
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
  } catch (e) {
    logger.error(e);
    const message = getAnalyticsErrorMessage(e);
    await reportsChannel.send(
      `Failed to send daily analytics report: ${message}`,
    );
  }
}

function isFirstDayOfWeek(): boolean {
  return moment().isoWeekday() === 1;
}

function isFirstDayOfMonth(): boolean {
  return moment().date() === 1;
}
