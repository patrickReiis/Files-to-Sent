const http = require('http');
const fs = require('fs');
const path = require('path');

import {IncomingMessage, ServerResponse} from 'http';
import * as validator from './validator';
import 'reflect-metadata';
import { UserAccount } from './entity/UserAccount';
import { dataSource } from './get-data-source';
import * as password from './password';
import * as customRandom from './random';
import * as email from './email';
import { strict as assert} from 'assert';
import * as customCookie from './customCookie';
import * as customDates from './dates';
import { bot } from './bot/bot';bot; // If I don't type 'bot' the bot listener does not work. 

const port = process.env.PORT || 3000;
const hostname = 'localhost';

const request_KeysNotValidMsgRegister = `The only and required keys are 'email', 'username', 'password1', 'password2'`;
const request_KeysNotValidMsgLogin = `The only and required keys are 'email', 'password'`;
const request_warnValidJSON = `Please use an valid JSON object containing only strings`;

function isArrInObjectKeys(arr:string[],obj:object){

	for (let i = 0; Object.keys(obj).length > i; i++){
		if ( !(arr[i] in obj)){
			return false
		}
	}
	return true
}

function isBodyKeysValid(body:object, mode:string){
	assert.ok(mode === 'login' || mode === 'register');
	let allowedKeys:string[];
	let bodyArr = Object.keys(body);
	if (mode === 'register') {
		allowedKeys = ['email', 'username', 'password1', 'password2'];
		// check if and only if the required keys are in the body object
		if (bodyArr.length === 4 && isArrInObjectKeys(allowedKeys, body)){
			return true
		}
		return false;
	}

	else if (mode === 'login') {
		allowedKeys = ['email', 'password'];
		// check if and only if the required keys are in the body object
		if (bodyArr.length === 2 && isArrInObjectKeys(allowedKeys, body)){
			return true
		}	
		return false
	}
		
}

function isValidJSON(data:string){
	try {
		JSON.parse(data);
		return true
	} 
	catch (e) {
		console.log(e);
		return false
	}
}

async function handleRegister(body:any, res: ServerResponse){
	if( !isBodyKeysValid(body, 'register') ){
	        res.writeHead(400, {'Content-Type':'application/json'})
	        res.end(JSON.stringify( { 'error' : request_KeysNotValidMsgRegister } ) )
	} else {
	        const result = await validator.getAllRegisterValidation(body);
	
	        if (result['success'] === true){
	                const user = new UserAccount();
	                user.username = body.username;
	                user.email = body.email;
	                user.password = await password.encrypt(body.password1);
	                user.uniqueString = await customRandom.randStr();
	
	                await dataSource.getRepository(UserAccount).save(user);
	                //await email.sendMail(user.email, user.uniqueString)
	
	                res.writeHead(200, {'Content-Type':'application/json'});
	                res.end(JSON.stringify({'success':`An email has been sent to ${user.email} Check it out and click in the link to validate your account`}))
	        } else {
	                res.writeHead(400, {'Content-Type': 'application/json'});
	                res.end(JSON.stringify( { 'errors':result.errors } ) );
	        }
	}
}

async function handleLogin(body:any, res:ServerResponse){
	if ( !isBodyKeysValid(body, 'login')){
	        res.writeHead(400, {'Content-Type':'application/json'});
	        res.end(JSON.stringify( {'error': request_KeysNotValidMsgLogin} ) )
	} else {
		try {  // An error can happen if the password.isEqual recivies anything that is not a string, that's why this code is in a try block
			const userEmail = body.email;
			const userPassword = body.password;
			const user = await dataSource.getRepository(UserAccount).findOneBy({'email':userEmail});

			// User exists, user is active and the password is correct
			if (user !== null && await password.isEqual(user.password, userPassword) && user.isActive === true){
			
				let cookieExpiresHeader:Date;

				// If user already has a session, send it back again through the cookie. This helps if the user logs in into differents browsers
				if (user.sessionId && user.cookieExpires && !customDates.isCookieExpired(new Date(), <Date>user.cookieExpires)){
					cookieExpiresHeader = user.cookieExpires;
				}
				else {
					user.sessionId = await customRandom.sessionId();
					user.cookieExpires = customDates.getNextYear(new Date()); 
					await dataSource.getRepository(UserAccount).save(user);

					cookieExpiresHeader = user.cookieExpires;
				}				

				res.writeHead(302, {
					'Location':'/dashboard',
					'Set-Cookie':[
						`sessionid=${user.sessionId};Path=/;Expires=${cookieExpiresHeader.toUTCString()};HttpOnly`
					]
				})
				res.end()
			}

			// User exists but is not active
			else if (user && user.isActive === false){
			       	res.writeHead(400) // If the user is not active, there is no point in doing the request again	
				res.end('user not active')
			}

			// User exists, user is active but the password is incorrect 
			else if (user && user.isActive === true){ 
				res.end('password does not match, damn')
			}

			// User does not exist
			else { 
				res.writeHead(400, {'Content-Type':'application/json'});
				res.end(JSON.stringify({error:'Couldn\'t find this account'}))
			}

		} 
		catch(e){
			console.log(e);
			res.writeHead(400)
			res.end(request_warnValidJSON) 
		}
	}
}

async function isUserAuthenticated(cookies:string|undefined):Promise<boolean>{
	if (!cookies) return false;

	const cookieObj = customCookie.parse(cookies);

	if (!cookieObj.sessionid) return false;

	const user = await dataSource.getRepository(UserAccount).findOneBy({sessionId:cookieObj.sessionid});

	if (!user) return false;	
	
	const today = new Date()
	const cookieAge = user.cookieExpires;
	
	if ( customDates.isCookieExpired(today, <Date>cookieAge) ){
		user.cookieExpires = null;
		user.sessionId = null;
		await dataSource.getRepository(UserAccount).save(user);
		return false
	}

	return true
}

const server = http.createServer(async(req:IncomingMessage, res:ServerResponse) => {
	// Build filepath
	let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
	
	// Extension of file
	let extname = path.extname(filePath);
	
	// Initial content type
	let contentType = 'text/html';
	
	// Check ext and set content type
	switch(extname) {
	        case '.js':
	                contentType = 'text/javascript';
	                break;
	
	        case '.html':
	                contentType = 'text/html';
	                break;
	
	        case '.css':
	                contentType = 'text/css';
	                break;
	
	        case '.json':
	                contentType = 'application/json';
	                break;
	
	        case '.png':
	                contentType = 'image/png';
	                break;
	
	        case '.jpg':
	                contentType = 'image/jpg';
	                break;
	        case '.otf':
	                contentType = 'application/x-font-opentype';
	                break;
	}
	
	if (req.method === 'GET'){
			
		if (req.url === '/dashboard'){

			// if user is authorized (both activate and with session) allow to proceed
			if (await isUserAuthenticated(req.headers.cookie)){
				const sessionid = customCookie.parse(<string>req.headers.cookie).sessionid
				res.end('don\' give up, pls '+ sessionid )
			} 
			else {
				res.writeHead(302, {'Location':'/login', 'Set-Cookie':['sessionid=null;Max-Age=0']})
				res.end('tchau, you should not see it if you have a valid cookie')
			}
		}
	        else if (req.url === '/login'){
			const successFlashMsg = req.headers.cookie ? customCookie.parse(<string>req.headers.cookie).success : '';
			res.end(`look at the console + ${successFlashMsg}`)
		}	
		else if ( (req.url as string).slice(0, '/api/v1/verify?'.length) === '/api/v1/verify?'){
			const fullURL = new URL( (req.url as string) , `http://${req.headers.host}`);
			const confirmParameterValue:string|null = fullURL.searchParams.get('confirm');
			const parametersLength = Array.from(fullURL.searchParams.keys()).length;

			if ( /^[0-9]+$/.test((confirmParameterValue as string)) && parametersLength === 1 ){ // Make sure it's only made of digits and there is only one parameter 
				// load user, validate user, remove user unique string (make null), redirect
	                	const user = await dataSource.getRepository(UserAccount).findOneBy({uniqueString:(confirmParameterValue as string)});
				if (user){
					user.isActive = true;
					user.uniqueString = null;
					await dataSource.getRepository(UserAccount).save(user)
					res.writeHead(302, {
						'Location':'/login',
						'Set-Cookie':
							[
								`success=${btoa('Your account has been validated, log in to join.')};Path=/;Max-Age=1`,
							] // The cookie will contain a sucess flash message (if the user refresh the page it will dissapear because Max-Age is set to 1 second)
					});
					res.end()
				} else {
					res.writeHead(404) 
					res.end() // I can load the not found HTML page here in the future. 03/09/2022
				}
			} else {
				res.writeHead(400, {'Content-Type':'application/json'})
				res.end(JSON.stringify({error:'URL not valid'}))
			}	
		} 
		else {
			fs.readFile(filePath, (err:NodeJS.ErrnoException, content:Buffer) => {
			        if (err) {
			                if (err.code === 'ENOENT'){
			                        // Page not found
			                        fs.readFile(path.join(__dirname, 'public', '404.html'), (err:NodeJS.ErrnoException, content:Buffer) => {
			                                if (err) throw err;
			                                res.writeHead(200, {'Content-Type':'text/html'});
			                                res.end(content);
			                        })
			                } else {
			                        // Some server error 
			                        res.writeHead(500);
			                        res.end(`Server Error: ${err.code}`)
			                }
			        } else {
			        	// Success 
				        res.writeHead(200, {'Content-Type': contentType});
				        res.end(content); 
				}
			})
		}
 	}
 
	if (req.method === 'POST'){
		let data = '';
		req.on('data', chunk => {
			data += chunk;
		})
		req.on('end', async () => {
			if (isValidJSON(data)){
				let body = JSON.parse(data);
				
				if (req.url === '/api/v1/register'){
					handleRegister(body, res);
				} 
				else if (req.url === '/api/v1/login'){
					handleLogin(body, res);
				} 
				else {
					res.writeHead(404);
					res.end('not found');
				}
			} else {
				res.writeHead(400)
				res.end(request_warnValidJSON)
			}
		});
	}

	if (req.method === 'PUT'){
		res.end()
	}

	if (req.method === 'DELETE'){
		res.end()
	}

})
server.listen(port, () => {
  console.log(`Server running at http://${hostname}:${port}`)
})
