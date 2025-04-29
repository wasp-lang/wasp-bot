import Discord from "discord.js";

import { REPORTS_CHANNEL_ID } from "../../server-ids";
import { fetchTextChannelById } from "../../utils";
import {
  AnalyticsReportType,
  sendAnalyticsReportToReportsChannel,
} from "./common";

export function isAnalyticsCommand(message: Discord.Message): boolean {
  return hasAnalyticsPrefix(message) && isReportsChannel(message.channel);
}

function hasAnalyticsPrefix(message: Discord.Message): boolean {
  return message.content.startsWith("!analytics");
}

function isReportsChannel(channel: Discord.Channel): boolean {
  return channel.id.toString() === REPORTS_CHANNEL_ID;
}

export async function handleAnalyticsCommand(
  discordClient: Discord.Client,
  message: Discord.Message,
): Promise<void> {
  const analyticsCommand = parseAnalyticsCommand(message.content);
  if (!analyticsCommand) {
    await sendAnalyticsHelp(discordClient);
    return;
  }

  const { period, numPeriods } = analyticsCommand;
  if (period === "total") {
    await sendAnalyticsReportToReportsChannel(discordClient, "total");
  } else {
    await sendAnalyticsReportToReportsChannel(
      discordClient,
      period,
      undefined,
      numPeriods,
    );
  }
}

/**
 * Parses analytics command of the form: !analytics <period> [number]
 * Example: !analytics weekly 5
 * Returns an object with period and optional numPeriods.
 */
function parseAnalyticsCommand(
  command: string,
): { period: AnalyticsReportType; numPeriods?: number } | undefined {
  const commandRegex =
    /^!analytics\s+(weekly|monthly|daily|total)(?:\s+(\d+))?/i;
  const match = command.match(commandRegex);
  if (!match) return;

  const period = match[1].toLowerCase() as AnalyticsReportType;
  if (period === "total") {
    return { period };
  }

  const numPeriodsString = match.at(2);
  const numPeriods = numPeriodsString
    ? parseInt(numPeriodsString, 10)
    : undefined;

  return { period, numPeriods };
}

async function sendAnalyticsHelp(discordClient: Discord.Client): Promise<void> {
  const channel = await fetchTextChannelById(discordClient, REPORTS_CHANNEL_ID);
  await channel.send(
    `Available commands:
  !analytics daily <period_number>
  !analytics weekly <period_number>
  !analytics monthly <period_number>
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
