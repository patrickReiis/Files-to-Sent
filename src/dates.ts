export function isCookieExpired(today:Date, cookieDate:Date):boolean{
	return !(today < cookieDate)
}

export function getNextYear(today:Date):Date{
	const currentYear = today.getUTCFullYear();
	today.setUTCFullYear(currentYear + 1);
	const nextYear = new Date(today);
	return nextYear 
}
