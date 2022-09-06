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

const port = process.env.PORT || 3000;
const hostname = 'localhost';

const request_KeysNotValidMsg = `The only and required keys are 'email', 'username', 'password1', 'password2'`;

function isArrInObjectKeys(arr:string[],obj:object){
	for (let i = 0; Object.keys(obj).length > i; i++){
		if ( !(arr[i] in obj)){
			return false
		}
	}
	return true
}

function isBodyKeysValid(body:object){
	let allowedKeys:string[] = ['email', 'username', 'password1', 'password2'];
	let bodyArr = Object.keys(body);
	// check if and only if the required keys are in the body object
	if (bodyArr.length === 4 && isArrInObjectKeys(allowedKeys, body)){
		return true
	}
	
	return false;
}

async function handleRegister(body:any, res: ServerResponse){

	if( !isBodyKeysValid(body) ){
	        res.writeHead(400, {'Content-Type':'application/json'})
	        res.end(JSON.stringify( { 'error' : request_KeysNotValidMsg } ) )
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
			// if user is authorizaded (both activate and with session) allow to proceed
			if(req.headers.cookie){
				const cookieValue = atob( req.headers.cookie.slice('success='.length) )
				res.end(`flashmessage:` + cookieValue)
			}

			else{res.end('no flashmessage')}
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
						'Location':'/dashboard',
						'Set-Cookie':
							[
								`success=${btoa('Your account  has been validated, log in to join.')};Path=/;Max-Age=1`,
							] // The cookie will contain a sucess flash message (if the user refresh the page it will dissapear)
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
		else if(req.url === '/dashboard'){
			res.end('hi, a message will be shown once')

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
			let body = JSON.parse(data);
			
			if (req.url === '/api/v1/register'){
				handleRegister(body, res);
			} 
			else if (req.url === '/api/v1/login'){
				res.writeHead(301, {Location:'/dashboard'})
				res.end()
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
