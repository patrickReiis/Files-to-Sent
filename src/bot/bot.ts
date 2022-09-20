import { Bot } from 'grammy';
import { getHandler, cleanHandler, statusHandler } from './commands-handler'

// Create an instance of the `Bot` class and exporting it
export const bot = new Bot(process.env.BOT_KEY as string);

const instructionsMsg = `
		The available commands are:

			/get <name> - This command attach you to an user and you will recieve files if the user you typed decides to send you a file.

			Example of how to use: /get steve

			/clean - This command desattach you to the user you were attached before. This is helpful if you want to change the user since you can only be attached to one user at a time.

			/status - Tells if you are attached to an account.	
			`

// Handle the /start command.
bot.command('start', (ctx) => ctx.reply('Welcome to Files To Sent!\n\nWith this bot you can attach a user and receive files that the user decides to share with you. Type anything to know the available commands.'));

// Handle the /get command.
bot.command('get', getHandler)

// Handle the /clean command.
bot.command('clean', cleanHandler)

// Handle the /status command.
bot.command('status', statusHandler)

// Handle other messages.
bot.on('message', (ctx) => ctx.reply(instructionsMsg));

// Starting the bot. (This will connect to the Telegram servers and wait for messages)
bot.start();
