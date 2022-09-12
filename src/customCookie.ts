type CookieObj = {
	sessionid?:string;
	success?:string;
}

export function parse(cookies:string):CookieObj{
	const cookiesArr:string[] = cookies.split('; ');
	const allCookiesObj:CookieObj = {}; 
	const key = 0;
	const value = 1;	

	let key_value:string[]

	for (let i = 0; i < cookiesArr.length; i++){

		// Split only the first matching '=' character
		key_value = cookiesArr[i].split(/=(.*)/s);
		
		if (key_value[key] === 'sessionid'){
			allCookiesObj.sessionid = key_value[value];
		}

		else if (key_value[key] === 'success'){
			allCookiesObj.success = atob(key_value[value]);
		}
	}

	return allCookiesObj	
}
