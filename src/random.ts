const crypto = require('crypto');

// 2 functions, sessionId and unique string
export async function randStr(){
	const len = 10;
	let randomString = '';
	for (let i = 0; i < len; i++){
		// ch = a number between 1 to 10
		const ch = Math.floor((Math.random() * 10) + 1);
		randomString += ch
	}	
	return randomString.slice(0, len)
}

export async function sessionId(){
	const size:number = 62
	return crypto
		.randomBytes(size)
		.toString('hex')
		.slice(0, size);
}
