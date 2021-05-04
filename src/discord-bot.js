const Discord = require('discord.js')
const schedule = require('node-schedule');

const logger = require('./logger')
const analytics = require('./analytics')


const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const GUILD_ID = '686873244791210014'
const REPORTS_CHANNEL_ID = '835130205928030279'
const GUEST_ROLE_ID = '812299047175716934'
const INTRODUCTIONS_CHANNEL_ID = '689916376542085170'

const start = () => {
  const bot = new Discord.Client({})
  bot.login(BOT_TOKEN)

  bot.on('ready', async (evt) => {
    logger.info(`Logged in as: ${bot.user.tag}.`)
    // Send analytics report on Monday at 00:30.
    const job = schedule.scheduleJob('30 0 * * 1', async () => {
      await sendAnalyticsReport(bot)
    })
  })

  bot.on('message', async msg => {
    if (msg.content.startsWith('!intro ')) {
      if (msg.channel.id.toString() !== INTRODUCTIONS_CHANNEL_ID) {
        const introductionsChannelName = msg.guild.channels.resolve(INTRODUCTIONS_CHANNEL_ID).name
        return msg.reply(`Please use !intro command in the ${introductionsChannelName} channel!`)
      }

      const introMsg = msg.content.substring('!intro '.length).trim()
      const minMsgLength = 20
      if (introMsg.length < minMsgLength) {
        return msg.reply(`Please write introduction at least ${minMsgLength} characters long!`)
      }

      const member = msg.guild.member(msg.author)
      try {
        if (member.roles.cache.get(GUEST_ROLE_ID)) {
          await member.roles.remove(GUEST_ROLE_ID)
          return msg.reply('Nice getting to know you! You are no longer a guest and have full access, welcome!')
        }
      } catch (error) {
        return msg.reply(`Error: ${error}`)
      }
    }

    if (msg.content === '!analytics' && msg.channel.id.toString() === REPORTS_CHANNEL_ID) {
      await sendAnalyticsReport(bot)
    }
  })
}

const sendAnalyticsReport = async (bot) => {
  const report = await analytics.generateReport()
  const guild = await bot.guilds.fetch(GUILD_ID)
  const waspTeamTextChannel = guild.channels.resolve(REPORTS_CHANNEL_ID)
  waspTeamTextChannel.send('=============== WEEKLY ANALYTICS REPORT ===============')
  for (const metric of report) {
    const text = metric.text.join('\n')
    const chartImageUrl = metric.chart.toURL()
    const embed = new Discord.MessageEmbed()
    embed.setImage(chartImageUrl)
    waspTeamTextChannel.send(text, embed)
  }
  waspTeamTextChannel.send('=======================================================')
}

module.exports = {
  start
}
