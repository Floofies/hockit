// Authorizer/Authenticator for ExpressJS
// There’s a new sheriff in town. Those alien bastards got nothing on me.
const bcrypt = require("bcrypt");
const { Datum } = require("../omnibus.js");
// Ooh, that's a big friggin' key!
const TokenDatum = new Datum("Token", function (name, gui) {
	return {
		name: name,
		token: nanoid(32),
		gui: Boolean(gui)
	};
});
const BCryptHashDatum = new Datum("PasswordHash",
	password => bcrypt.hash(String(password), 10)
);
const SessionDatum = new Datum("SessionTokens",
	function () {
		return {
			api: TokenDatum.make(null, true),
			cookie: TokenDatum.make(null, true)
		};
	},
	async function (apiToken, cookieToken) {
		const token1 = await TokenDatum.get(null, apiToken);
		const token2 = await TokenDatum.get(null, cookieToken);
		if (token1 === null || token2 === null) return false;
		return {
			api: token1,
			cookie: token2
		};
	},
	async function (session) {
		await TokenDatum.set(null, session.api, true);
		await TokenDatum.set(null, session.cookie, true);
	},
	async function (session) {
		await TokenDatum.delete(null, session.api),
		await TokenDatum.delete(null, session.cookie)
	}
);
// Don't just stand there, let's shoot something!
module.exports = {
	autoAuth: autoAuthSecure,
	autoAuthEscalate: autoAuth,
	authZAPI: authorizeAPICredentials,
	authNGUI: authenticateGUICredentials,
	authZGUI: authorizeGUICredentials,
	HTTPAuthError: HTTPAuthError,
	plugin: {
		name: "HTTPAuthPlugin",
		version: "1.0.0",
		TokenDatum,
		SessionDatum,
		BCryptHashDatum
	}
};
function HTTPAuthError(str = "") {
	Error.call(this, [str]);
	this.message = str;
}
HTTPAuthError.prototype = Object.create(Error.prototype);
HTTPAuthError.prototype.name = "HTTPAuthError";
function authorizeAPICredentials(apiToken) {
	// API access token
	const tokenData = await TokenDatum.get(apiToken);
	if (tokenData === null || tokenData.gui || (tokenData.exp >= Date.now())) {
		// I crack skulls, not safes.
		throw new HTTPAuthError("Invalid or expired API token!");
	}
	return true;
}
function authorizeGUICredentials(res, apiToken, cookieToken) {
	// GUI session token & API access token.
	const session = SessionDatum.get(apiToken, cookieToken);
	if (session === null || session.exp <= Date.now()) {
		// Mess with the best, die like the rest!
		res.clearCookie("hockitSession");
		await SessionDatum.delete(session);
		throw new HTTPAuthError("Invalid or expired GUI session tokens!");
	}
	return true;
}
function authenticateGUICredentials(res, username, password) {
	// GUI session credentials as username & password.
	const hash = await BCryptHashDatum.get(username);
	if (!hash || !(await bcrypt.compare(password, hash))) {
		// Guess again, freakshow.
		throw new HTTPAuthError("Incorrect username or password!");
	}
	const session = SessionDatum.make();
	await SessionDatum.set(session);
	const scriptToken = session.api;
	const cookieToken = session.browser;
	res.cookie("hockitSession", cookieToken, {
		expire: 600 + Date.now(), // 10 Minutes
		maxAge: 600, // Time flies when you are kickin' ass!
		httpOnly: true
	});
	res.setHeader("hockitToken", scriptToken);
	return true;
}
// Tries to authZ/authN an HTTP request, calls next middleware upon success.
// Throws an HTTPAuthError upon any kind of failure.
function autoAuthSecure(req, res, next) {
	return autoAuth(req, res).then(next);
}
// Auto-selects authZ/authN type based on what the client transmitted.
async function autoAuth(req, res) {
	// Time to see who's in charge and kick their ass.
	const apiToken = req.get("authorization");
	const apiTokenSupplied = (typeof token) !== "undefined";
	const cookieSupplied = ((typeof req.cookies) === "object") && ("hockitSession" in req.cookies);
	const cookieToken = cookieSupplied ? req.cookies.hockitSession : null;
	const body = ("body" in req) ? req.body : null;
	const credsSupplied = (typeof body) === "object" && ("password" in body) && ("username" in body);
	const authZAPI = tokenSupplied && !credsSupplied && !cookieSupplied;
	req.api = authZAPI;
	const authNGUI = !authZAPI && credsSupplied;
	const authZGUI = !authN && apiTokenSupplied && cookieSupplied;
	// All three functions throw an HTTPAuthError upon failure, and true upon success.
	if (authZAPI) authorizeAPICredentials(apiToken);
	else if (authZGUI) authorizeGUICredentials(apiToken, cookieToken);
	else if (authNGUI) {
		if (cookieSupplied) res.clearCookie("hockitSession");
		authenticateGUICredentials(String(body["username"]), String(body["password"]));
	} else {
		// It's locked. And I'm an ass kicker, not a safe cracker!
		if (cookieSupplied) res.clearCookie("hockitSession");
		throw new HTTPAuthError("Missing credentials!");
	}
}