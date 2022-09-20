import { Context } from 'grammy';
import { UserAccount } from '../entity/UserAccount';
import { UserTelegram } from '../entity/UserTelegram';
import { dataSource } from '../get-data-source';


// get handler
const userNotFound = `Could not find this username. Remember that the username is case-sensitive.`;
const botIsNotAllowed = `Bots cannot use this service, only users`;
const userIsAlreadyAttached = `You are already attached to an account. To disattach use the command /clean`;
const userSavedMsg = (name:string) => {return `You saved ${name} account! Now you just need to wait for ${name} to send you a file.`}

// clean handler
const notAttachedMsg = `You are not attached anymore to any account.`

// status handler
const attachedToMsg = (username:string) => {return 'You are currently attached to ' + username + '.'};
const currentlyNotAttached = `You are currently not attached to any account.`;

// It seems that grammy does not export the 'User' type in node js, only in deno. 
// This custom type is created based on the deno type.
// You can check it at https://deno.land/x/grammy@v1.11.0/types.deno.ts?s=User 
interface UserGrammy { 
	id:number;
	is_bot:boolean;
	first_name:string;
	username?:string;
	language_code?:string;
}

export async function getHandler(ctx:Context){
	if (ctx.update.message?.from == undefined){ // 'message.from' may return undefined (I couldn't figure out why though)
		return
	}

	const usernameRequest = ctx.match; // ctx.match returns the UserAccount that the UserTelegram wants to get. 
	if ((usernameRequest as string).length  < 1){ // I know for sure that the UserAccount must have a length greater than 0
		ctx.reply(userNotFound);
		return
	}

	const userAccount = await dataSource.manager.findOneBy(UserAccount, {username:usernameRequest as string}) // The account requested by the telegram user must exist
	if (userAccount == null){
		ctx.reply(userNotFound);
		return
	}

	const userTelegramData:UserGrammy = ctx.update.message.from; // The user that made the request to my bot
	if (userTelegramData.is_bot === true){
		ctx.reply(botIsNotAllowed);
		return
	}
	
	const userAlreadyExists = await dataSource.getRepository(UserTelegram).findOneBy( {telegramId: userTelegramData.id} ) // The telegram user can have only one account attached
	if (userAlreadyExists) {
		ctx.reply(userIsAlreadyAttached)
		return
	}


	// If the code reaches here it means:
	// The UserAccount requested by the telegram user exists
	// The UserTelegram is not attached to an UserAccount, which means it doesn't exist


	const userTelegram = new UserTelegram(); // The user that will be saved in the database
	userTelegram.telegramId = userTelegramData.id;
	userTelegram.owner = userAccount;
	userTelegramData.username ? userTelegram.username = userTelegramData.username : {}; // Set username in userTelegram if userTelegramData has a username
	userTelegram.first_name = userTelegramData.first_name;

	await dataSource.manager.save(userTelegram); // Saving the telegram user to the database
	
	ctx.reply(userSavedMsg(userAccount.username))


}

export async function cleanHandler(ctx:Context){
		
	if (ctx.update.message?.from == undefined){ // 'message.from' may return undefined (I couldn't figure out why though)
		return
	}

	const userTelegramData:UserGrammy = ctx.update.message.from; // The user that made the request to my bot
	
	await dataSource.getRepository(UserTelegram).delete( {telegramId: userTelegramData.id} )

	ctx.reply(notAttachedMsg)
}

export async function statusHandler(ctx:Context){
	
	const userTelegramId = ctx.update.message?.from?.id; // The user id that made the request to my bot
	
	if (userTelegramId == undefined){
		return
	}	

	const userTelegramDatabase = await dataSource.getRepository(UserTelegram).findOne({
		where: {
			telegramId: userTelegramId
		}, relations: {
			owner:true
		}
	})

	if (userTelegramDatabase == null){
		ctx.reply(currentlyNotAttached);
		return
	}
	
	const userTelegramAttachedTo = await dataSource.getRepository(UserAccount).findOneBy({ id: userTelegramDatabase.owner.id})

	ctx.reply(attachedToMsg((userTelegramAttachedTo as UserAccount).username))
		
}
