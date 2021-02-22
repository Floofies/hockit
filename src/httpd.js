// HTTP/HTTPS server for Hockit
// Don't just stand there, let's shoot something!
const fs = require('fs');
const bcrypt = require("bcrypt");
const express = require('express');
const multer = require("multer");
const { Datum } = require("../plugins/omnibus.js");
const encodeBase64 = v => Buffer.from(v).toString("base64");
const decodeBase64 = v => Buffer.from(v, "base64").toString();
const prod = process.env.NODE_ENV === "production";
const BootConfigDatum = new Datum("BootConfig");
const File = new Datum("FileBlob");
const FileList = new Datum("FileList");
const Metadata = new Datum("FileMetadata");
// HTTPStorage expects a Multer Storage instance via "make".
const HTTPStorage = new Datum("HTTPStorage");
const TokenDatum = new Datum("Token", function (name, owner, gui, exp = Infinity) {
	return {
		name: name,
		owner: owner,
		token: nanoid(32), // Ooh, that's a big friggin' key!
		gui: Boolean(gui),
		expires: gui ? Date.now() + 600000 : exp
	};
});
const BCryptHashDatum = new Datum("PasswordHash");
const SessionDatum = new Datum("SessionTokens",
	function (username) {
		const session = {
			api: TokenDatum.make(null, username, true),
			cookie: TokenDatum.make(null, username, true)
		};
		session.expires = api.expires;
		session.owner = username;
	},
	async function (apiToken, cookieToken) {
		const token1 = await TokenDatum.get(null, apiToken);
		const token2 = await TokenDatum.get(null, cookieToken);
		if (token1 === null || token2 === null) return false;
		return {
			api: token1,
			cookie: token2,
			owner: token1.owner,
			expires: Math.min(token1.expires, token2.expires)
		};
	},
	async function (session) {
		await TokenDatum.set(null, session.owner, session.api, true, session.expires);
		await TokenDatum.set(null, session.owner, session.cookie, true, session.expires);
	},
	async function (session) {
		await TokenDatum.delete(null, session.api),
			await TokenDatum.delete(null, session.cookie)
	}
);
async function initPlugin() {
	return await startServer(makeApp());
}
async function startServer(app) {
	const config = await BootConfigDatum.get();
	if (!config.ssl) {
		var server = app.listen(config.port);
	} else {
		if (config.ssl && (config.sslCert === "" || config.sslKey === "")) {
			if (tty) console.error("The required SSL PEM certificate & SSL PEM key paths are missing. Set them up with:\n\thockit ssl cert <path>\n\thockit ssl key <path>");
			if (tty) console.error("\nOr, if you want to disable SSL:\n\thockit ssl disable");
			process.exit(1);
		}
		const https = require("https");
		const httpsConf = {
			key: fs.readFileSync(config.sslKey),
			cert: fs.readFileSync(config.sslCert)
		};
		if (config.sslPass !== "") httpsConf.passphrase = config.sslPass;
		var server = https.createServer(httpsConf, app).listen(config.port);
	}
	server.app = app;
	return server;
}
function wrapDataURL(text, links = {}) {
	return "?data=" + encodeURIComponent(encodeBase64(JSON.stringify({ text: text, links: links })));
}
function wrapDataAPI(error = null, data = null) {
	return { error: error, data: data };
}
async function makeApp() {
	const config = await BootConfigDatum.get();
	const multerStorage = await HTTPStorage.make();
	const upload = multerStorage ? multer(multerStorage) : multer();
	const parseFile = upload.single("upload");
	const app = express();
	// SSL sanity checking.
	app.use("/*", (req, res, next) => {
		// Server can't serve via SSL.
		if (!hockit.config.ssl) next();
		else if (req.secure) {
			// The best things in life never change.
			if (prod) res.setHeader("Strict-Transport-Security", "max-age=86400"); // 1 day
			next();
		} else if (req.protocol !== "https") {
			// What are you waitin' for? Christmas?
			res.setHeader("Upgrade", "TLS/2.0")
			res.sendStatus(426);
		}
	});
	// Useful for scripted server monitoring.
	app.get("/_healthcheck", (req, res) => {
		res.send("OK");
	});
	// Serve any static files from the webroot.
	// Ask and you shall receive.
	app.use(express.static(hockit.webroot));
	// Looking for Session Token cookie.
	app.use(express.cookieParser());
	// List files.
	app.post("/list",
		upload.none(),
		autoAuthSecure,
		(req, res, next) => {
			const size = ("pageSize" in req.body) ? Number(req.body.pageSize) : 25;
			const page = ("page" in req.body) ? Number(req.body.page) : 0;
			const links = FileList.get(page * size, (page * size) + size);
			if (req.api) res.send(wrapDataAPI(null, links));
			else {
				if (links.total === 0) res.redirect(303, "/" + wrapDataURL("No files found."));
				else {
					const totalPages = links.total / size;
					const curPage = links.total > size ? page : 0;
					res.redirect(303, "/uploads/" + wrapDataURL("", links) + "#" + curPage + "/" + totalPages);
				}
			}
		}
	);
	// List a specific file by its hash.
	app.get("/list/:id",
		upload.none(),
		autoAuthSecure,
		(req, res, next) => {
			const hash = String(req.params.id);
			const file = Metadata.get(hash);
			if (!file) {
				if (req.api) res.status(404).send(wrapDataAPI("File " + hash + " not found.", null));
				else res.redirect(303, "/" + wrapDataURL("File " + hash + " not found."));
				return;
			}
			if (req.api) res.send(wrapDataAPI(null, file));
			else res.redirect(303, "/uploads/" + wrapDataURL("", file));
		}
	);
	// Upload a file and make a new hash.
	app.post("/up",
		autoAuthSecure,
		parseFile,
		async (req, res, next) => {
			const buf = req.file.buffer;
			const name = req.file.originalname;
			const file = await Metadata.make(buf, name);
			await File.set(file);
			if (req.api) res.send(wrapDataAPI(null, file));
			else res.redirect(303, "/uploads/" + wrapDataURL("Uploaded file " + name, file));
		}
	);
	// Download a file by its hash.
	app.get('/:id',
		(req, res) => {
			const hash = req.params.id;
			const links = Metadata.get(hash);
			if (links.files.length === 0) {
				res.sendStatus(404);
				return;
			}
			const path = "/uploads/" + links.files[0].hash + "." + links.files[0].name;
			fs.access(hockit.webroot + path, fs.constants.F_OK | fs.constants.R_OK, (err) => {
				if (err) {
					res.sendStatus(404);
					return;
				}
				res.sendFile(path, {
					root: hockit.webroot
				});
			});
		}
	);
	// Delete a file by its hash.
	app.post("/delete/:id",
		upload.none(),
		autoAuthSecure,
		async (req, res, next) => {
			const hash = String(req.params.id);
			await File.del(hash);
			await Metadata.del(hash);
			if (req.api) {
				res.sendStatus(200);
				return;
			}
			const list = FileList.get();
			if (list.total === 0) res.redirect(303, "/" + wrapDataURL("Deleted file " + hash, list));
			else res.redirect(303, "/uploads/" + wrapDataURL("Deleted file " + hash, list));
			if (!deleted) {
				if (req.api) {
					req.sendStatus(404);
					return;
				}
				const list = FileList.get();
				if (list.total === 0) res.redirect(303, "/" + wrapDataURL("File " + hash + " not found."));
				else res.redirect(303, "/uploads/" + wrapDataURL("File " + hash + " not found.", list));
			}
		});
	app.use(handleError);
	return app;
}
function handleHTTPAuthError(err, req, res, next) {
	// It's time to blow this party.
	const api = ("api" in req) && req.api;
	const message = prod ? "Incorrect Password" : err.message;
	if (api) res.status(401).send(wrapDataAPI(message));
	else res.redirect(303, "/" + wrapDataURL(message));
}
function handleError(err, req, res, next) {
	// Rome wasn’t built in a day, but it's time to fall!
	if (err.name !== "HTTPAuthError") return handleHTTPAuthError(err, req, res, next);
	if (process.stdout.isTTY) console.error(err);
	if (api) res.status(500).send(wrapDataAPI(err));
	else res.status(500).send(err.message);
}
// Authorization/Authentication for ExpressJS
// There’s a new sheriff in town. Those alien bastards got nothing on me.
function HTTPAuthError(str = "") {
	// Ideal for home defense!
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
	if (session === null || session.expires <= Date.now()) {
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
		expire: new Date(session.expires).toUTCString(), // 10 Minutes
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
	const apiToken = req.get("Authorization");
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
module.exports = {
	name: "HTTPPlugin",
	version: "1.0.0",
	initPlugin,
	BootConfigDatum,
	File,
	Storage,
	Metadata,
	BCryptHashDatum,
	TokenDatum,
	SessionDatum
};