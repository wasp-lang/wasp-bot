import Discord from "discord.js";
import { getAnalyticsErrorMessage } from "../../../analytics/errors";
import moment from "../../../analytics/moment";
import * as reports from "../../../analytics/reports";
import logger from "../../../utils/logger";
import { sendAnalyticsReport } from "../../reports";
import { fetchTextChannelById } from "../../utils";

const REPORTS_CHANNEL_ID = "835130205928030279";

export async function initiateAnalyticsReport(
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
    const events = await reports.fetchEventsForReportGenerator();

    await sendAnalyticsReport(discordClient, "total", events);
    await sendAnalyticsReport(discordClient, "daily", events);

    if (isFirstDayOfWeek()) {
      await sendAnalyticsReport(discordClient, "weekly", events);
    }

    if (isFirstDayOfMonth()) {
      await sendAnalyticsReport(discordClient, "monthly", events);
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
