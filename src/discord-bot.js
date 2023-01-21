const Discord = require('discord.js')
const schedule = require('node-schedule')
const Quote = require('inspirational-quotes')
const retry = require('async-retry')

const logger = require('./logger')
const analytics = require('./analytics')


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

  bot.on('ready', async (evt) => {
    logger.info(`Logged in as: ${bot.user.tag}.`)

    // Every day at 7:00 am, send analytics reports.
    schedule.scheduleJob({hour: 7, minute: 0, tz: timezone}, async () => {
      // By prefetching events, we can reuse them when generating multiple reports and not just daily ones.
      // We retry it a couple of times because Posthog's API can sometimes be flaky.
      // I am guessing that more events we will have, the worse it will get, because we will be fetching more of them,
      // so in that case we might have to revisit our fetching strategy and cache intermediate results.
      const events = await retry(async () => {
        return analytics.fetchAllCliEvents()
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

  bot.on('message', async msg => {
    // Ignore messages from the bot itself.
    if (msg.author.id === bot.user.id) {
      return;
    }

    const member = msg.guild.member(msg.author)

    if (msg.channel.id.toString() === INTRODUCTIONS_CHANNEL_ID && member.roles.cache.get(GUEST_ROLE_ID)) {
      const trimmedMsg = msg.content.trim().length;
      if (trimmedMsg < 20) {
        return msg.reply(
          `\n👋 Great to have you here! Pls introduce yourself with a message that's at least 2️⃣0️⃣ characters long and I will give you full access to the server. \n❌ BTW editing your old message won't work b/c I'm not a very smart bot🤖. Doh!`
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
      } else {
        await sendAnalyticsReport(bot, 'total')
      }
    }
  })
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
