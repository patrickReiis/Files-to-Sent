const passwordLength = 10;
const request_EmailNotValid = `The email is not valid`;
const request_UsernameNotValid = `The username can only contain letters and underscores between words`;
const request_PasswordNotValid = `The password must have at least ${passwordLength} characters`;
const request_PasswordDoesNotMatch = `The password does not match`;
const request_SendStringPass = `The password format must be a string`;
const request_SendStringEmail = `The email must be a string`;
import { UserAccount } from './entity/UserAccount';
import { strict as assert } from 'assert';
import { dataSource } from './get-data-source';

function isEmailValid(email:string){
	// Checks if email formatting is correct
	// Does not check if the email exists or if who subbmited the email is the owner of the email
	let tester = /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

	if (!email) return false;

	let emailParts = email.split('@');
	
	if(emailParts.length !== 2) return false;
	
	let account = emailParts[0];
	let address = emailParts[1];
	
	if(account.length > 64) return false;
	
	else if(address.length > 255) return false;
	
	let domainParts = address.split('.');
	if (domainParts.some(function (part) {
	  return part.length > 63;
	})) return false;
	
	if (!tester.test(email)) return false;
	
	return true;
}

function emailValidate(emailArr:string[]){
	const email = emailArr[0];
	const errorMessage = [];

	if (typeof email !== 'string'){
		errorMessage.push(request_SendStringEmail) 
	}
	else if ( !isEmailValid(email) ){
		errorMessage.push(request_EmailNotValid)
	}

	return errorMessage
}

async function emailTakenCheck(userEmailArr:string[]){
	assert.ok(userEmailArr.length === 1, 'The array shall have the length of one');

	const userEmail = userEmailArr[0];
	const possibleUser = await dataSource.getRepository(UserAccount).findOneBy({email:userEmail});

	const errorMessage:string[] = [];

	if (possibleUser !== null){
		errorMessage.push('You cannot use this email. Use another one')
	}

	return errorMessage
}

function isUsernameValid(username:string){
	const re = /^([a-zA-Z]+_)*[a-zA-Z]+$/; // allows only letters and one underscore between words
	if (re.test(username)) return true;

	return false
		
}

function usernameValidate(usernameArr:string[]){
	const username = usernameArr[0];
	const errorMessage = [];

	if( !isUsernameValid(username) ){
		errorMessage.push(request_UsernameNotValid)
	}

	return errorMessage
}

function passwordValidate(pass:string[]){ // pass = password
	const errorMessages:string[] = [];
	const pass1 = pass[0];
	const pass2 = pass[1];	

	if (pass1.length < passwordLength || pass2.length < passwordLength){
		errorMessages.push(request_PasswordNotValid)
	}

	if (pass1 !== pass2){
		errorMessages.push(request_PasswordDoesNotMatch)
	}

	if (typeof pass1 !== 'string' || typeof pass2 !== 'string'){
		errorMessages.push(request_SendStringPass)
	}	
	return errorMessages
} 

async function validRegister(field:string[], isValid:(field:string[]) => string[]|Promise<string[]>){ // Array of strings is nescessary to valite if password1 and password2 are equal
	return await isValid(field);
}

export async function getAllRegisterValidation(bodyObj:any){
	// A list of functions will iterate and get all erros messages (if any)
	// If there is not a single error, success will be set to true
	// And the function will return

	const successOrErrorMsg:any = { 'success': false, 'errors': [] }; 

	const errorMessages:string[][] = [
		await validRegister([bodyObj.password1, bodyObj.password2], passwordValidate),
		await validRegister([bodyObj.username], usernameValidate),	
		await validRegister([bodyObj.email], emailValidate),
		await validRegister([bodyObj.email], emailTakenCheck)
	];

	for (const msgArr of errorMessages){
		if (msgArr.length > 0){
			for (const strMsg of msgArr){
				successOrErrorMsg.errors.push(strMsg)
			}
		}
	}

	if (successOrErrorMsg['errors'].length === 0) {
		successOrErrorMsg['success'] = true;
	}

	return await successOrErrorMsg
}
