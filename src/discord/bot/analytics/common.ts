import Discord from "discord.js";

import { PosthogEvent } from "../../../analytics/wasp-cli-usage/events";
import * as reports from "../../../analytics/wasp-cli-usage/reports";
import {
  ChartReport,
  ImageChartsReport,
  TextReport,
} from "../../../analytics/wasp-cli-usage/reports/reports";
import { Writable } from "../../../types/helpers";
import logger from "../../../utils/logger";
import { REPORTS_CHANNEL_ID } from "../../server-ids";
import { fetchTextChannel } from "../../utils";

export type AnalyticsReportType = "daily" | "weekly" | "monthly" | "total";

export async function sendAnalyticsReportToReportsChannel(
  discordClient: Discord.Client,
  reportType: AnalyticsReportType,
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number | undefined = undefined,
): Promise<void> {
  logger.info(`Sending analytics report to the reports channel...`);
  logger.debug(
    `Analytics report details: type=${reportType}, numPeriods=${numPeriods}, prefetchedEvents=${!!prefetchedEvents}`,
  );
  const waspReportsChannel = await fetchTextChannel(
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
  logger.info("Converting report to a Discord message");
  const options: Discord.MessageCreateOptions = {};
  const embeds: Writable<Discord.MessageCreateOptions["embeds"]> = [];
  const files: Writable<Discord.MessageCreateOptions["files"]> = [];

  if (report.text) {
    logger.debug("Report has a `text` field");
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
    logger.debug(
      `Report has a \`imageChartsChart\` field (URL=${report.imageChartsChart.toURL()})`,
    );
    embeds.push(
      new Discord.EmbedBuilder().setImage(report.imageChartsChart.toURL()),
    );
  }

  if (report.bufferChart) {
    logger.debug("Report has a `bufferChart` field");
    files.push(report.bufferChart);
  }

  options.embeds = embeds;
  options.files = files;
  return options;
}
