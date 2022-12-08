const Discord = require('discord.js')
const schedule = require('node-schedule')
const Quote = require('inspirational-quotes')

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

    // Send weekly analytics report on Monday at 7:00 am.
    schedule.scheduleJob({dayOfWeek: 1, hour: 7, minute: 0, tz: timezone}, async () => {
      await sendAnalyticsReport(bot, 'weekly')
    })

    // Send daily analytics report every day at 7:00.
    schedule.scheduleJob({hour: 7, minute: 0, tz: timezone}, async () => {
      await sendAnalyticsReport(bot, 'daily')
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
      const trimmedMsg = msg.content.trim().length
      if (trimmedMsg < 20 ) {
        return msg.reply(`\n✅ Please write another introduction at least 2️⃣0️⃣ characters long.\n❌ DON'T EDIT your old message, I'm not a very smart bot🤖! \nThanks 🙏`)
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
      } else {
        await sendAnalyticsReport(bot, 'daily')
      }
    }
  })
}

const sendAnalyticsReport = async (bot, period) => {
  let reportPromise, periodText
  if (period == 'weekly') {
    reportPromise = analytics.generateWeeklyReport()
    periodText = 'WEEKLY'
  } else if (period == 'daily') {
    reportPromise = analytics.generateDailyReport()
    periodText = 'DAILY'
  }

  const guild = await bot.guilds.fetch(GUILD_ID)
  const waspTeamTextChannel = guild.channels.resolve(REPORTS_CHANNEL_ID)

  waspTeamTextChannel.send(`Generating report...`)

  const report = await reportPromise
  waspTeamTextChannel.send(`=============== ${periodText} ANALYTICS REPORT ===============`)
  for (const metric of report) {
    const text = metric.text.join('\n')
    const chartImageUrl = metric.chart.toURL()
    const embed = new Discord.MessageEmbed()
    embed.setImage(chartImageUrl)
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
