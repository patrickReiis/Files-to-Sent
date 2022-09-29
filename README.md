## Note
The original purpose of this project was to create a REST API that is able to send files to users in whatsapp. From what I've searched however the Whatsapp API isn't free so instead I decided to use a telegram bot (which is free). 
The only limitation that a telegram bot has is that it can't initiate conversations so if you want to test this project you or your users will have to send a message to the telegram bot first, but it will be explained later in detail.


## Create database
```
$ psql postgres

postgres=# CREATE DATABASE filestosent;
postgres=# \q
```

## Setup enviorement variables
Inside the root directory create a **config/dev.env** file.
The .env file requires the following structure:
```
PORT=3000
NODEMAILER_EMAIL=
NODEMAILER_EMAIL_PASSWORD=
BOT_KEY=
DATABASE_USERNAME=
DATABASE_PASSWORD=
```

* You can generate a BOT_KEY with the [Bot Father](https://t.me/botfather)
* To generate the NODEMAILER_EMAIL_PASSWORD you need to enable Two-factor authentication in your google account and [generate a password with it](https://support.google.com/accounts/answer/185833?hl=en). If you don't have a google account find a way to connect with less secure apps with your email provider.

## Install dependencies
```
$ npm install
```


## Run the application 
```
$ npm run dev
```

## How to use (in order)
First you need to create an account:
* localhost:3000/api/register | Method: POST | Body Format: JSON | JSON Format: {"username":"<your-username>", "email":"<your-email>", "password1":"<your-password>", "password2": "<your-password>"}

Then you will recieve an email with a confirmation link to validate your account, the **confirm** key of the **query parameter** will always be a sequence of random numbers.
* localhost:3000/api/verify?confirm=<sequence of random numbers> | Method: GET 

Now you can log-in, if everything goes right in this process you will recieve a **sessionid cookie**.
* localhost:3000/api/login | Method: POST | Body Format: JSON | JSON Format: {"email":"<your-email>", "password": "<your-password>"}

Now you can send files to the users attached to your bot:
* localhost:3000/api/v1/sendAll | Method: POST | Body Format: JSON | JSON Format: {"url":"<your-url>"}

## Making users attach to your account
-- finish
