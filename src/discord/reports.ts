import Discord from "discord.js";
import { PosthogEvent } from "../analytics/events";
import * as reports from "../analytics/reports";
import { ChartReport, TextReport } from "../analytics/reports/reports";
import { fetchTextChannelById } from "./utils";

const REPORTS_CHANNEL_ID = "835130205928030279";

const DISCORD_MAX_MSG_SIZE = 2000;
const DISCORD_MESSAGE_TOO_LONG_SUFFIX =
  "\n... ⚠️ MESSAGE CUT BECAUSE IT IS TOO LONG...";

export function covertSimpleReportToDiscordMessage(
  report: Partial<TextReport & ChartReport>,
): Discord.MessageOptions {
  const options: Discord.MessageOptions = {};
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

  if (report.chart) {
    const embed = new Discord.MessageEmbed();
    embed.setImage(report.chart.toURL());

    options.embed = embed;
  }

  return options;
}

export async function sendAnalyticsReport(
  discordClient: Discord.Client,
  reportType: "daily" | "weekly" | "monthly" | "total",
  prefetchedEvents: PosthogEvent[] | undefined = undefined,
  numPeriods: number | undefined = undefined,
): Promise<void> {
  const waspReportsChannel = await fetchTextChannelById(
    discordClient,
    REPORTS_CHANNEL_ID,
  );

  waspReportsChannel.send(`⏳ Generating ${reportType} report...`);
  const compositeReport = await getAnalyticsReport(
    reportType,
    prefetchedEvents,
    numPeriods,
  );

  waspReportsChannel.send(
    `=============== ${reportType.toUpperCase()} ANALYTICS REPORT ===============`,
  );
  for (const simpleReport of Object.values(compositeReport)) {
    waspReportsChannel.send(covertSimpleReportToDiscordMessage(simpleReport));
  }
  waspReportsChannel.send(
    "=======================================================",
  );
}

function getAnalyticsReport(
  reportType: "daily" | "weekly" | "monthly" | "total",
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
