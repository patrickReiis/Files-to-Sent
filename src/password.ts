const argon2 = require('argon2')

export async function encrypt(plainTextPassword:string){
	return await argon2.hash(plainTextPassword);
}

export async function isEqual(hashPassword:string, candidatePassword:string){
	return await argon2.verify(hashPassword, candidatePassword);
}

