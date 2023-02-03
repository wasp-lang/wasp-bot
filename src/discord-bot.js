const Discord = require('discord.js')
const schedule = require('node-schedule')
const Quote = require('inspirational-quotes')
const retry = require('async-retry')
const moment = require('moment')

require('dotenv').config()

const logger = require('./utils/logger')
const analytics = require('./analytics/analytics')


const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = '686873244791210014'
const REPORTS_CHANNEL_ID = '835130205928030279'
const DAILY_STANDUP_CHANNEL_ID = '842082539720146975'
const GUEST_ROLE_ID = '812299047175716934'
const INTRODUCTIONS_CHANNEL_ID = '689916376542085170'

const timezone = 'Europe/Zagreb'

const start = () => {
  const bot = new Discord.Client({})
  bot.login(BOT_TOKEN)

  bot.on('ready', async () => {
    logger.info(`Logged in as: ${bot.user.tag}.`)

    // Every day at 7:00 am, send analytics reports.
    schedule.scheduleJob({hour: 7, minute: 0, tz: timezone}, async () => {
      // By prefetching events, we can reuse them when generating multiple reports and not just daily ones.
      // We retry it a couple of times because Posthog's API can sometimes be flaky.
      // I am guessing that more events we will have, the worse it will get, because we will be fetching more of them,
      // so in that case we might have to revisit our fetching strategy and cache intermediate results.
      const events = await retry(async () => {
        return analytics.fetchEventsForReportGenerator()
      }, {retries: 3})

      // Send total and daily analytics report every day.
      await sendAnalyticsReport(bot, 'total', events)
      await sendAnalyticsReport(bot, 'daily', events)

      // It today is Monday, also send weekly analytics report.
      if (moment().isoWeekday() === 1) {
        await sendAnalyticsReport(bot, 'weekly', events)
      }

      // It today is first day of the month, also send monthly analytics report.
      if (moment().date() === 1) {
        await sendAnalyticsReport(bot, 'monthly', events)
      }
    })

    // Initiate daily standup every day at 8:00.
    schedule.scheduleJob({dayOfWeek: [1,2,3,4,5], hour: 8, minute: 0, tz: timezone}, async () => {
      await initiateDailyStandup(bot)
    })
  })

  bot.on('message', async msg => handleMessage(bot, msg))

  bot.on('messageUpdate', async (oldMessage, newMessage) => handleMessage(bot, newMessage))
}

const handleMessage = async (bot, msg) => {
  // Ignore messages from the bot itself.
  if (msg.author.id === bot.user.id) {
    return;
  }

  const member = msg.guild.member(msg.author)

  if (msg.channel.id.toString() === INTRODUCTIONS_CHANNEL_ID && member.roles.cache.get(GUEST_ROLE_ID)) {
    const trimmedMsg = msg.content.trim().length;
    if (trimmedMsg < 20) {
      return msg.reply(
        `\n👋 Great to have you here! Pls introduce yourself with a message that's at least 2️⃣0️⃣ characters long and I will give you full access to the server.`
      );
    }
    try {
      await member.roles.remove(GUEST_ROLE_ID)
      return msg.reply('Nice getting to know you ☕️! You now have full access to the Wasp Discord 🐝. Welcome!')
    } catch (error) {
      return msg.reply(`Error: ${error}`)
    }
  }

  if (msg.content.startsWith('!analytics') && msg.channel.id.toString() === REPORTS_CHANNEL_ID) {
    if (msg.content.includes('weekly')) {
      await sendAnalyticsReport(bot, 'weekly')
    } else if (msg.content.includes('monthly')) {
      await sendAnalyticsReport(bot, 'monthly')
    } else if (msg.content.includes('daily')) {
      await sendAnalyticsReport(bot, 'daily')
    } else if (msg.content.includes('total'))  {
      await sendAnalyticsReport(bot, 'total')
    } else {
      await sendAnalyticsHelp(bot)
    }
  }
}

const sendAnalyticsHelp = async (bot) => {
  const guild = await bot.guilds.fetch(GUILD_ID)
  const channel = guild.channels.resolve(REPORTS_CHANNEL_ID)
  await channel.send(
`Available commands:
  !analytics daily
  !analytics weekly
  !analytics monthly
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
`
  )
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
`
  )
}

const sendAnalyticsReport = async (bot, reportType, prefetchedEvents = undefined) => {
  let reportPromise, reportTitle
  if (reportType == 'monthly') {
    reportPromise = analytics.generateMonthlyReport(prefetchedEvents)
    reportTitle = 'MONTHLY'
  } else if (reportType == 'weekly') {
    reportPromise = analytics.generateWeeklyReport(prefetchedEvents)
    reportTitle = 'WEEKLY'
  } else if (reportType == 'daily') {
    reportPromise = analytics.generateDailyReport(prefetchedEvents)
    reportTitle = 'DAILY'
  } else if (reportType == 'total') {
    reportPromise = analytics.generateTotalReport(prefetchedEvents)
    reportTitle = 'TOTAL'
  }
  const guild = await bot.guilds.fetch(GUILD_ID)
  const waspTeamTextChannel = guild.channels.resolve(REPORTS_CHANNEL_ID)

  waspTeamTextChannel.send(`Generating report...`)

  const report = await reportPromise
  waspTeamTextChannel.send(`=============== ${reportTitle} ANALYTICS REPORT ===============`)
  for (const metric of report) {
    const text = metric.text?.join('\n')

    let embed = undefined
    if (metric.chart) {
      embed = new Discord.MessageEmbed()
      embed.setImage(metric.chart.toURL())
    }

    waspTeamTextChannel.send(text, embed)
  }
  waspTeamTextChannel.send('=======================================================')
}

const initiateDailyStandup = async (bot) => {
  const guild = await bot.guilds.fetch(GUILD_ID)
  const dailyStandupChannel = guild.channels.resolve(DAILY_STANDUP_CHANNEL_ID)

  const wisdom = (q => `${q.text} | ${q.author}`)(Quote.getQuote())

  dailyStandupChannel.send(
    'Time for daily standup!'
    + '\nHow was your day yesterday, what are you working on today, and what are the challenges you are encountering?'
    + '\n\nDaily fun/wisdom: ' + wisdom
  )
}

module.exports = {
  start
}
