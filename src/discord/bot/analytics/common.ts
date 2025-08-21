import Discord from "discord.js";

import { PosthogEvent } from "../../../analytics/events";
import * as reports from "../../../analytics/reports";
import {
  ChartReport,
  ImageChartsReport,
  TextReport,
} from "../../../analytics/reports/reports";
import { Mutable } from "../../../types/helpers";
import { REPORTS_CHANNEL_ID } from "../../server-ids";
import { resolveTextChannelById } from "../../utils";

export type AnalyticsReportType = "daily" | "weekly" | "monthly" | "total";

export async function sendAnalyticsReportToReportsChannel(
  discordClient: Discord.Client,
  reportType: AnalyticsReportType,
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number | undefined = undefined,
): Promise<void> {
  const waspReportsChannel = resolveTextChannelById(
    discordClient,
    REPORTS_CHANNEL_ID,
  );

  waspReportsChannel.send(`⏳ Generating ${reportType} report...`);
  const compositeReport = await generateAnalyticsReport(
    reportType,
    prefetchedEvents,
    numPeriods,
  );

  waspReportsChannel.send(
    `=============== ${reportType.toUpperCase()} ANALYTICS REPORT ===============`,
  );
  for (const simpleReport of Object.values(compositeReport)) {
    waspReportsChannel.send(convertSimpleReportToDiscordMessage(simpleReport));
  }
  waspReportsChannel.send(
    "=======================================================",
  );
}

function generateAnalyticsReport(
  reportType: AnalyticsReportType,
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number | undefined = undefined,
): Promise<{ [reportName: string]: Partial<TextReport & ChartReport> }> {
  if (reportType === "monthly") {
    return reports.generateMonthlyReport(prefetchedEvents, numPeriods);
  } else if (reportType === "weekly") {
    return reports.generateWeeklyReport(prefetchedEvents, numPeriods);
  } else if (reportType === "daily") {
    return reports.generateDailyReport(prefetchedEvents, numPeriods);
  } else if (reportType === "total") {
    return reports.generateTotalReport(prefetchedEvents);
  } else {
    throw new Error(`Unknown report type: ${reportType}`);
  }
}

const DISCORD_MAX_MSG_SIZE = 2000;
const DISCORD_MESSAGE_TOO_LONG_SUFFIX =
  "\n... ⚠️ MESSAGE CUT BECAUSE IT IS TOO LONG...";

function convertSimpleReportToDiscordMessage(
  report: Partial<TextReport & ChartReport & ImageChartsReport>,
): Discord.MessageCreateOptions {
  const options: Discord.MessageCreateOptions = {};
  const embeds: Mutable<Discord.MessageCreateOptions["embeds"]> = [];
  const files: Mutable<Discord.MessageCreateOptions["files"]> = [];

  if (report.text) {
    let content: string = report.text.join("\n");
    if (content.length >= DISCORD_MAX_MSG_SIZE) {
      content =
        content.substring(
          0,
          DISCORD_MAX_MSG_SIZE - DISCORD_MESSAGE_TOO_LONG_SUFFIX.length,
        ) + DISCORD_MESSAGE_TOO_LONG_SUFFIX;
    }
    options.content = content;
  }

  if (report.imageChartsChart) {
    embeds.push(
      new Discord.EmbedBuilder().setImage(report.imageChartsChart.toURL()),
    );
  }

  if (report.bufferChart) {
    files.push(report.bufferChart);
  }

  options.embeds = embeds;
  options.files = files;
  return options;
}
