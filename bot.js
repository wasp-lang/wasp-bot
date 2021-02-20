const Discord = require('discord.js')
const logger = require('winston')

logger.remove(logger.transports.Console)
logger.add(new logger.transports.Console, { colorize: true })
logger.level = 'debug'

const BOT_TOKEN = process.env.BOT_TOKEN

const bot = new Discord.Client({})
bot.login(BOT_TOKEN)

bot.on('ready', function (evt) {
  logger.info(`Logged in as: ${bot.user.tag}.`)
})

const GUEST_ROLE_ID = "812299047175716934"
const INTRODUCTIONS_CHANNEL_ID = "689916376542085170"

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
})
