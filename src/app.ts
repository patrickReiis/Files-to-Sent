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
import { bot } from './bot/bot';

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
            await email.sendMail(user.email, user.uniqueString)

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
                } // Create session for user
                else {
                    user.sessionId = await customRandom.sessionId();
                    user.cookieExpires = customDates.getNextYear(new Date()); 
                    await dataSource.getRepository(UserAccount).save(user);

                    cookieExpiresHeader = user.cookieExpires;
                }				

                res.writeHead(200, {
                    'Set-Cookie':[
                        `sessionid=${user.sessionId};Path=/;Expires=${cookieExpiresHeader.toUTCString()};HttpOnly`
                    ],
                    'Content-Type': 'application/json'
                })
                res.end(JSON.stringify({'success': 'You are logged in! Now you can send files to your users :)'}))
            }

            // User exists but is not active
            else if (user && user.isActive === false){
                res.writeHead(400, {'Content-Type':'application/json'}) // If the user is not active, there is no point in doing the request again	
                res.end(JSON.stringify({'error': 'You need to validate your account. Check the email you used to register'}))
            }

            // User exists, user is active but the password is incorrect 
            else if (user && user.isActive === true){ 
                res.writeHead(400, {'Content-Type':'application/json'})
                res.end(JSON.stringify({'error': 'Password does not match'}))
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
    try {
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

    catch (error){
        console.log(error);
        return false
    }
}

const server = http.createServer(async(req:IncomingMessage, res:ServerResponse) => {

    if (req.method === 'GET'){

        if ( (req.url as string).slice(0, '/api/v1/verify?'.length) === '/api/v1/verify?'){
            const fullURL = new URL( (req.url as string) , `http://${req.headers.host}`);
                const confirmParameterValue:string|null = fullURL.searchParams.get('confirm');
            const parametersLength = Array.from(fullURL.searchParams.keys()).length;

            // Make sure the value of the Query Params is only made of digits and there is only one key
            // Examples:
            // localhost:3000/api/v1/verify?confirm=12345            VALID
            // localhost:3000/api/v1/verify?confirm=12a345           NOT VALID
            if ( /^[0-9]+$/.test((confirmParameterValue as string)) && parametersLength === 1 ){ 
                // load user, validate user, remove user unique string (make null), redirect
                const user = await dataSource.getRepository(UserAccount).findOneBy({uniqueString:(confirmParameterValue as string)});
                if (user){
                    user.isActive = true;
                    user.uniqueString = null;
                    await dataSource.getRepository(UserAccount).save(user)
                    res.writeHead(200);
                    res.end(JSON.stringify({'success': 'Your account has been validated, log in to join'}))
                } else {
                    res.writeHead(404) 
                    res.end() 
                }
            } else {
                res.writeHead(400, {'Content-Type':'application/json'})
                res.end(JSON.stringify({error:'URL not valid. Only numbers allowed.'}))
            }	
        } 
        else {
            res.writeHead(404, {'Content-Type':'application/json'});
            res.end(JSON.stringify({'error': 'Not found :('}))
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
                else if (req.url?.toLowerCase() === '/api/v1/sendall'){
                    
                    if (await isUserAuthenticated(req.headers.cookie)){
                        if (validator.isUrlBodyValid(body) === false){
                            res.writeHead(400, {'Content-Type':'application/json'});
                            res.end(JSON.stringify({error: 'Send ONLY one VALID URL. The json body format is { url: <your-url> }. Also remember that the only allowed files are PDF, GIF and ZIP'}))
                            return 
                        } 

                        const urlFilePath = body['url']
                        const sessionIdString = customCookie.parse(req.headers.cookie as string)?.sessionid
                        const userAccount = await dataSource.getRepository(UserAccount).findOne({
                            where: {
                                sessionId: sessionIdString
                            },
                            relations: {
                                telegramUsers:true
                            }
                        })
                        const telegramUsers = userAccount?.telegramUsers;
                        if (telegramUsers == undefined || telegramUsers.length == 0){
                            res.writeHead(404, {'Content-Type': 'application/json'})
                            res.end(JSON.stringify({error:'We tried to send your requested file to your users, but you don\'t have any users attached to you.'}))
                            return
                        }

                        const responseInfo = {'SentTo': [] as string[], 'CouldNotSentTo': [] as string[]}

                        // Iterate over telegram users, get their Id, and use that Id to send the file
                        for (let i = 0; i < telegramUsers.length; i++){
                            try {
                                await bot.api.sendDocument(telegramUsers[i].telegramId, urlFilePath) 
                                responseInfo['SentTo'].push(telegramUsers[i].first_name)
                            } catch (error:any){
                                console.log(error)

                                if (error.error_code === 403){ // user has blocked the bot (bots in telegram cannot start conversations)
                                    responseInfo['CouldNotSentTo'].push(telegramUsers[i].first_name)
                                }
                                else {
                                    res.writeHead(400, {'Content-Type': 'application/json'});
                                    res.end(JSON.stringify({error: 'Your URL is invalid, try to use a new URL instead or see if the one you used is valid. Depending on the name of the file telegram doesn\'t allow to send'}))
                                    return
                                }
                            }
                        }
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify(responseInfo))
                    } 
                    else {
                        res.writeHead(401, {'Set-Cookie':['sessionid=null;Max-Age=0']})
                        res.end()
                    }
                }	
                else {
                    res.writeHead(404);
                    res.end('Not Found :(');
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
