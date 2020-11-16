#!/usr/bin/env node
const bcrypt = require("bcrypt");
const fs = require('fs');
const express = require('express');
const multer = require("multer");
const encodeBase64 = v => Buffer.from(v).toString("base64");
const decodeBase64 = v => Buffer.from(v, "base64").toString();
function makeApp(hockit) {
	hockit.watchConfig(hockit.confPath);
	hockit.setupWebroot();
	function AuthError(str = "") {
		Error.call(this, [str]);
		this.message = str;
	}
	AuthError.prototype = Object.create(Error.prototype);
	AuthError.prototype.name = "AuthError";
	function auth(req, callback) {
		return new Promise((resolve, reject) => {
			const token = req.get("authorization");
			req.api = typeof token !== "undefined";
			if (req.api) {
				if (hockit.config.tokens.every(pair => pair[1] !== token)) reject(new AuthError("Invalid API token!"));
				else resolve();
				return;
			}
			if (!("body" in req) || !("password" in req.body)) {
				reject(new AuthError("Incorrect password!"));
				return;
			}
			bcrypt.compare(req.body["password"], hockit.config.hash, (err, pass) => {
				if (pass) resolve();
				else reject(new AuthError("Incorrect password!"));
			});
		});
	}
	function authHttp(req, res, next) {
		return auth(req).then(next).catch(err => handleError(err, req, res, next));
	}
	const upload = multer();
	const parseFile = upload.single("upload");
	const app = express();
	function wrapDataURL(text, links = {}) {
		return "?data=" + encodeURIComponent(encodeBase64(JSON.stringify({ text: text, links: links })));
	}
	function wrapDataAPI(error = null, data = null) {
		return { error: error, data: data };
	}
	function handleError(err, req, res, next) {
		const api = "api" in req && req.api;
		if (err.name === "AuthError") {
			if (api) res.status(401).send(wrapDataAPI(err.message, null));
			else res.redirect(303, "/" + wrapDataURL("Incorrect Password"));
		} else {
			if (process.stdout.isTTY) console.error(err);
			if (api) res.status(500).send(wrapDataAPI(err, null));
			else res.status(500).send(err.message);
		}
	}
	app.use("/*", (req, res, next) => {
		if (!hockit.config.ssl) next();
		else if (req.secure) {
			res.setHeader("Strict-Transport-Security", "max-age=5184000");
			next();
		} else if (req.protocol !== "https") {
			res.setHeader("Upgrade", "TLS/2.0")
			res.sendStatus(426);
		}
	});
	app.get("/_healthcheck", (req, res) => {
		res.send("OK");
	});
	app.use(express.static(hockit.webroot));
	app.post("/list",
		upload.none(),
		authHttp,
		(req, res, next) => {
			const links = hockit.list();
			if ("pageSize" in req.body) var size = Number(req.body.pageSize);
			else var size = 25;
			if (links.total > size && "page" in req.body) {
				var page = Number(req.body.page);
				links.files = links.files.slice(page * size, (page * size) + size);
			} else var page = 0;
			const totalPages = links.total / size;
			if (req.api) res.send(wrapDataAPI(null, links));
			else {
				if (links.total === 0) res.redirect(303, "/" + wrapDataURL("No files found."));
				else res.redirect(303, "/uploads/" + wrapDataURL("", links) + "#" + page + "/" + totalPages);
			}
		}
	);
	app.get("/list/:id",
		upload.none(),
		(req, res, next) => {
			const hash = req.params.id;
			const links = hockit.find(hash);
			if (links.total === 0) {
				if (req.api) res.status(404).send(wrapDataAPI("File " + hash + " not found.", null));
				else res.redirect(303, "/" + wrapDataURL("File " + hash + " not found."));
				return;
			}
			if (req.api) res.send(wrapDataAPI(null, links));
			else res.redirect(303, "/uploads/" + wrapDataURL("", links));
		}
	);
	app.post("/up",
		parseFile,
		authHttp,
		(req, res, next) => {
			const name = req.file.originalname;
			hockit.up(req.file.buffer, name).then(hash => {
				const links = hockit.find(hash);
				if (req.api) res.send(wrapDataAPI(null, links));
				else res.redirect(303, "/uploads/" + wrapDataURL("Uploaded file " + name, links));
			});
		}
	);
	app.get('/:id',
		(req, res) => {
			const hash = req.params.id;
			const links = hockit.find(hash);
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
	app.post("/delete/:id",
		upload.none(),
		authHttp,
		(req, res, next) => {
			const hash = req.params.id;
			hockit.delete(hash).then(() => {
				if (req.api) {
					res.sendStatus(200);
					return;
				}
				const list = hockit.list();
				if (list.total === 0) res.redirect(303, "/" + wrapDataURL("Deleted file " + hash, list));
				else res.redirect(303, "/uploads/" + wrapDataURL("Deleted file " + hash, list));
			}).catch((err) => {
				if (err === 404) {
					if (req.api) {
						req.sendStatus(404);
						return;
					}
					const list = hockit.list();
					if (list.total === 0) res.redirect(303, "/" + wrapDataURL("File " + hash + " not found."));
					else res.redirect(303, "/uploads/" + wrapDataURL("File " + hash + " not found.", list));
				} else handleError(err);
			});
		}
	);
	app.use(handleError);
	return app;
}
function startServer(hockit, app) {
	if (!hockit.config.ssl) {
		var server = app.listen(hockit.config.port);
	} else {
		if (hockit.config.ssl && (hockit.config.sslCert === "" || hockit.config.sslKey === "")) {
			if (tty) console.error("The required SSL PEM certificate & SSL PEM key paths are missing. Set them up with:\n\thockit ssl cert <path>\n\thockit ssl key <path>");
			if (tty) console.error("\nOr, if you want to disable SSL:\n\thockit ssl disable");
			process.exit(1);
		}
		const https = require("https");
		const httpsConf = {
			key: fs.readFileSync(hockit.config.sslKey),
			cert: fs.readFileSync(hockit.config.sslCert)
		};
		if (hockit.config.sslPass !== "") httpsConf.passphrase = hockit.config.sslPass;
		var server = https.createServer(httpsConf, app).listen(hockit.config.port);
	}
	server.hockit = hockit;
	server.app = app;
	return server;
}
module.exports = (hockit = null) => {
	if (hockit === null) hockit = require("hockit");
	return startServer(hockit, makeApp(hockit));
};