import Discord from "discord.js";
import { config as dotenvConfig } from "dotenv";
import Quote from "inspirational-quotes";
import _ from "lodash";
import schedule from "node-schedule";

import { getAnalyticsErrorMessage } from "./analytics/errors";
import moment from "./analytics/moment";
import * as reports from "./analytics/reports";
import logger from "./utils/logger";

dotenvConfig();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = "686873244791210014";
const REPORTS_CHANNEL_ID = "835130205928030279";
const DAILY_STANDUP_CHANNEL_ID = "842082539720146975";
const GUEST_ROLE_ID = "812299047175716934";
const INTRODUCTIONS_CHANNEL_ID = "689916376542085170";

const timezone = "Europe/Zagreb";

export const start = () => {
  const bot = new Discord.Client({});
  bot.login(BOT_TOKEN);

  bot.on("ready", async () => {
    logger.info(`Logged in as: ${bot.user.tag}.`);

    // Initiate daily standup every day at 8:00.
    schedule.scheduleJob(
      { dayOfWeek: [1, 2, 3, 4, 5], hour: 8, minute: 0, tz: timezone },
      async () => {
        await initiateDailyStandup(bot);
      },
    );

    // Every day at 7:00 am, send analytics reports.
    schedule.scheduleJob({ hour: 7, minute: 0, tz: timezone }, async () => {
      const reportsChannel = await fetchChannelById(bot, REPORTS_CHANNEL_ID);
      await reportsChannel.send(
        "📊 What time is it? It is time for daily analytics report!",
      );

      await reportsChannel.send("⏳ Fetching analytics events...");
      try {
        // By prefetching events, we can reuse them when generating multiple reports and not just daily ones.
        const events = await reports.fetchEventsForReportGenerator();

        // Send total and daily analytics report every day.
        await sendAnalyticsReport(bot, "total", events);
        await sendAnalyticsReport(bot, "daily", events);

        // It today is Monday, also send weekly analytics report.
        if (moment().isoWeekday() === 1) {
          await sendAnalyticsReport(bot, "weekly", events);
        }

        // It today is first day of the month, also send monthly analytics report.
        if (moment().date() === 1) {
          await sendAnalyticsReport(bot, "monthly", events);
        }
      } catch (e) {
        logger.error(e);
        const message = getAnalyticsErrorMessage(e);
        await reportsChannel.send(
          `Failed to send daily analytics report: ${message}`,
        );
      }
    });
  });

  bot.on("message", async (msg) => handleMessage(bot, msg));

  bot.on("messageUpdate", async (oldMessage, newMessage) =>
    handleMessage(bot, newMessage),
  );
};

const handleMessage = async (bot, msg) => {
  // Ignore messages from the bot itself.
  if (msg.author.id === bot.user.id) {
    return;
  }

  const member = msg.guild.member(msg.author);

  if (
    msg.channel.id.toString() === INTRODUCTIONS_CHANNEL_ID &&
    member.roles.cache.get(GUEST_ROLE_ID)
  ) {
    const trimmedMsg = msg.content.trim().length;
    if (trimmedMsg < 20) {
      return msg.reply(
        `\n👋 Great to have you here! Pls introduce yourself with a message that's at least 2️⃣0️⃣ characters long and I will give you full access to the server.`,
      );
    }
    try {
      await member.roles.remove(GUEST_ROLE_ID);
      return msg.reply(
        "Nice getting to know you ☕️! You now have full access to the Wasp Discord 🐝. Welcome!",
      );
    } catch (error) {
      return msg.reply(`Error: ${error}`);
    }
  }

  function getNumPeriodsFromAnalyticsCmd(cmd) {
    const match = cmd.match(/numPeriods\s*=\s*(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    return null;
  }

  if (
    msg.content.startsWith("!analytics") &&
    msg.channel.id.toString() === REPORTS_CHANNEL_ID
  ) {
    if (msg.content.includes("weekly")) {
      await sendAnalyticsReport(
        bot,
        "weekly",
        undefined,
        getNumPeriodsFromAnalyticsCmd(msg.content),
      );
    } else if (msg.content.includes("monthly")) {
      await sendAnalyticsReport(
        bot,
        "monthly",
        undefined,
        getNumPeriodsFromAnalyticsCmd(msg.content),
      );
    } else if (msg.content.includes("daily")) {
      await sendAnalyticsReport(
        bot,
        "daily",
        undefined,
        getNumPeriodsFromAnalyticsCmd(msg.content),
      );
    } else if (msg.content.includes("total")) {
      await sendAnalyticsReport(bot, "total");
    } else {
      await sendAnalyticsHelp(bot);
    }
  }
};

async function fetchChannelById(bot, channelId) {
  const guild = await bot.guilds.fetch(GUILD_ID);
  return guild.channels.resolve(channelId);
}

const sendAnalyticsHelp = async (bot) => {
  const channel = await fetchChannelById(bot, REPORTS_CHANNEL_ID);
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
};

const DISCORD_MAX_MSG_SIZE = 2000;

const sendAnalyticsReport = async (
  bot,
  reportType,
  prefetchedEvents = undefined,
  numPeriods = undefined,
) => {
  let reportPromise, reportTitle;
  if (reportType == "monthly") {
    reportPromise = reports.generateMonthlyReport(prefetchedEvents, numPeriods);
    reportTitle = "MONTHLY";
  } else if (reportType == "weekly") {
    reportPromise = reports.generateWeeklyReport(prefetchedEvents, numPeriods);
    reportTitle = "WEEKLY";
  } else if (reportType == "daily") {
    reportPromise = reports.generateDailyReport(prefetchedEvents, numPeriods);
    reportTitle = "DAILY";
  } else if (reportType == "total") {
    reportPromise = reports.generateTotalReport(prefetchedEvents);
    reportTitle = "TOTAL";
  }

  const waspTeamTextChannel = await fetchChannelById(bot, REPORTS_CHANNEL_ID);

  waspTeamTextChannel.send(`⏳ Generating ${reportType} report...`);

  const compositeReport: reports.CompositeReport = await reportPromise;
  waspTeamTextChannel.send(
    `=============== ${reportTitle} ANALYTICS REPORT ===============`,
  );
  for (const simpleReport of Object.values(compositeReport)) {
    const text = simpleReport.text?.join("\n");
    if (text && text.length >= DISCORD_MAX_MSG_SIZE) {
      const tooLongMessage = "\n... ⚠️ MESSAGE CUT BECAUSE IT IS TOO LONG...";

      text.substring(0, DISCORD_MAX_MSG_SIZE - tooLongMessage.length) +
        tooLongMessage;
    }

    let embed = undefined;
    if (simpleReport.chart) {
      embed = new Discord.MessageEmbed();
      embed.setImage(simpleReport.chart.toURL());
    }

    waspTeamTextChannel.send(text, embed);
  }
  waspTeamTextChannel.send(
    "=======================================================",
  );
};

const initiateDailyStandup = async (bot) => {
  const dailyStandupChannel = await fetchChannelById(
    bot,
    DAILY_STANDUP_CHANNEL_ID,
  );

  const wisdomQuote = ((q) => `${q.text} | ${q.author}`)(Quote.getQuote());
  const waspQuote = ((q) => `${q[0]} | ${q[1]}`)(
    _.sample([
      ["No hour of life is wasted that is spent in the saddle.", "Vince"],
      ["Food nourishes the body, but meetings nourish the soul.", "Filip"],
      ["Shirt is just a social construct.", "Miho"],
      [
        "Don't be too dogmatic, unless we're talking about Dogma the beer brewery.",
        "Milica, wannabe home brewer",
      ],
      ["Let's send them some swag! Martin will take care of it.", "Matija"],
      [
        "I don't have time to review PRs but it seems I do have time to implement these silly quotes.",
        "Martin",
      ],
    ]),
  );
  const quote = Math.random() < 0.1 ? waspQuote : wisdomQuote;

  dailyStandupChannel.send(
    "☀️ Time for daily standup!" +
      "\nHow was your day yesterday, what are you working on today, and what are the challenges you are encountering?" +
      "\n\n💡 Daily quote: " +
      quote,
  );
};
