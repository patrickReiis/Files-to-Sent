const nodemailer = require('nodemailer');
import { SentMessageInfo } from 'nodemailer';

export async function sendMail(email:string, uniqueString:string){
	let Transport = nodemailer.createTransport({
		service:'Gmail',
		auth: {
			user:process.env.NODEMAILER_EMAIL,
			pass: process.env.NODEMAILER_EMAIL_PASSWORD
		}
	});
	let mailOptions;
	let sender = 'Znescau';
	mailOptions = {
		from: sender,
		to: email,
		subject: 'Email Confirmation',
		html:`Press <a href=http://localhost:${process.env.PORT}/api/v1/verify?confirm=${uniqueString}> here </a> to verify your email`,
	};

	Transport.sendMail(mailOptions, function(error:Error, response:SentMessageInfo){
		if (error) {
			console.log(error)
		} else {
			console.log(response, typeof response)
			console.log(`Message sent to ${email}`)
		}
	})
}
