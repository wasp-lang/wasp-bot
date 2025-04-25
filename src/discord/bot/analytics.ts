import Discord from "discord.js";
import moment from "moment";
import { getAnalyticsErrorMessage } from "../../analytics/errors";
import { PosthogEvent } from "../../analytics/events";
import * as reports from "../../analytics/reports";
import { fetchEventsForReportGenerator } from "../../analytics/reports";
import { ChartReport, TextReport } from "../../analytics/reports/reports";
import logger from "../../utils/logger";
import { REPORTS_CHANNEL_ID } from "../channel-ids";
import { fetchTextChannelById } from "../utils";

export function isAnalyticsMessage(message: Discord.Message): boolean {
  return message.content.startsWith("!analytics");
}

export async function handleAnalyticsMessage(
  discordClient: Discord.Client,
  message: Discord.Message,
): Promise<void> {
  if (!isReportsChannel(message.channel)) {
    return;
  }

  if (message.content.includes("weekly")) {
    await sendAnalyticsReport(
      discordClient,
      "weekly",
      undefined,
      getNumPeriodsFromAnalyticsCommand(message.content),
    );
  } else if (message.content.includes("monthly")) {
    await sendAnalyticsReport(
      discordClient,
      "monthly",
      undefined,
      getNumPeriodsFromAnalyticsCommand(message.content),
    );
  } else if (message.content.includes("daily")) {
    await sendAnalyticsReport(
      discordClient,
      "daily",
      undefined,
      getNumPeriodsFromAnalyticsCommand(message.content),
    );
  } else if (message.content.includes("total")) {
    await sendAnalyticsReport(discordClient, "total");
  } else {
    await sendAnalyticsHelp(discordClient);
  }
}

function isReportsChannel(channel: Discord.Channel): boolean {
  return channel.id.toString() === REPORTS_CHANNEL_ID;
}

function getNumPeriodsFromAnalyticsCommand(cmd: string): number | undefined {
  const match = cmd.match(/numPeriods\s*=\s*(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
}

async function sendAnalyticsHelp(discordClient: Discord.Client): Promise<void> {
  const channel = await fetchTextChannelById(discordClient, REPORTS_CHANNEL_ID);
  await channel.send(
    `Available commands:
  !analytics daily [numPeriods=<int>]
  !analytics weekly [numPeriods=<int>]
  !analytics monthly [numPeriods=<int>]
  !analytics total

If nothing is said, stats are being shown for "normal" usage -> meaning that Replit/Gitpod/CI
are not included in the stats. When they are, it is explicitly stated so.

Each of the period (daily/weekly/monthly) reports shows the number of unique active users per
period, for some number of periods in the past.

Each bar in the user activity chart consists of sub-bars, via which users are grouped by their
age, where age is the number of days since the user's first activity. So if for a specific week
we have 3 unique active users reported to have age of >30d, that means that they were active
during that specific week and that their age in general is more than 30 days.

For weekly and monthly reports we also show cohort retention tables. In those, we take the last
N periods, and for each one of them focus on the users that first tried Wasp during that period
(new users) -> that is one cohort. Then we show how many of them from that cohort are still
active in the following periods - how they behaved (were active) through time. One row in the
table represents one period / cohort, and each column shows their activity in the later periods.
Notice that numbers in one row don't always monotonically fall, because we are not showing how
many users have stopped using Wasp at each following period, but instead how many were active at
each following period. For example, some users might be inactive for a couple of periods but
then they become active again, resulting in a spike in later periods.
`,
  );
  // We split it into two messages because one message has limit of 2000 characters.
  await channel.send(
    `In each period report we also show the number of unique created projects till the end of each
period, and the number of unique projects that were built till the end of each period. That
means it doesn't matter if a projects was built 1 time or 100 times -> we only care about the
number of projects that had >=1 build. Currently we just list the numbers, but they are for the
same periods as is the user activity bar chart. They are however cummulative.

Finally, "total" report shows some stats for the whole time period we have data for.

Daily and total report are automatically generated every day, weekly every start of the week
(for the last week), and monthly every start of the month (for the last month).

If you want more control and generate some reports manually, you can check out
wasp-lang/wasp-bot repo and generate them locally, README has instructions on this.
`,
  );
}

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
    const events = await fetchEventsForReportGenerator();

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

type CliReportTypes = "daily" | "weekly" | "monthly" | "total";

export async function sendAnalyticsReport(
  discordClient: Discord.Client,
  reportType: CliReportTypes,
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
    waspReportsChannel.send(convertSimpleReportToDiscordMessage(simpleReport));
  }
  waspReportsChannel.send(
    "=======================================================",
  );
}

function getAnalyticsReport(
  reportType: CliReportTypes,
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
