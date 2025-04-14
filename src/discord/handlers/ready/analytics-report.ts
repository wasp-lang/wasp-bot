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
    // By prefetching events, we can reuse them when generating multiple reports and not just daily ones.
    const events = await reports.fetchEventsForReportGenerator();

    // Send total and daily analytics report every day.
    await sendAnalyticsReport(discordClient, "total", events);
    await sendAnalyticsReport(discordClient, "daily", events);

    // It today is Monday, also send weekly analytics report.
    if (moment().isoWeekday() === 1) {
      await sendAnalyticsReport(discordClient, "weekly", events);
    }

    // It today is first day of the month, also send monthly analytics report.
    if (moment().date() === 1) {
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
