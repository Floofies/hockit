#!/usr/bin/env node
// HockIt V1
const bcrypt = require("bcrypt");
const fs = require('fs');
const confPath = "./config.json";
try { fs.statSync(confPath); }
catch (_) { fs.closeSync(fs.openSync(confPath, "w")); }
const confJson = fs.readFileSync(confPath).toString("utf8");
function saveConfig(config) {
	fs.writeFileSync(confPath, JSON.stringify(config));
}
if (confJson.length === 0) {
	var config = {
		webroot: "./www",
		fqdn: "",
		links: {},
		token: null,
		hash: null
	};
	saveConfig(config);
} else {
	var config = JSON.parse(confJson);
}
if (process.argv[2]) {
	const argName = process.argv[2];
	if (argName === "passwd") {
		if (process.argv[3]) {
			console.log("Setting new HockIt password");
			bcrypt.hash(process.argv[3], 10, (e, hash) => {
				config.hash = hash;
				saveConfig(config);
			});
		}
	} else if (argName === "domain") {
		if (process.argv[3]) {
			console.log("Setting HockIt domain name to " + process.argv[3]);
			config.fqdn = process.argv[3];
			saveConfig(config);
		}
	}
	return;
}
console.log("Starting HockIt server");
try { fs.statSync(config.webroot); }
catch (_) { fs.mkdirSync(config.webroot); }
try { fs.statSync(config.webroot + "/uploads"); }
catch (_) { fs.mkdirSync(config.webroot + "/uploads"); }
function auth(req, callback) {
	if (!("password" in req.body)) callback(null, new Error("Incorrect password!"));
	bcrypt.compare(req.body["password"], config.hash, (err, pass) => {
		if (pass) callback(null, true);
		else callback(new Error("Incorrect password!"), false);
	});
}
if ((typeof window) === "undefined" || !("btoa" in window)) var btoa = v => Buffer.from(v).toString("base64");
if ((typeof window) === "undefined" || !("atob" in window)) var atob = v => Buffer.from(v, "base64").toString();
const express = require('express');
const multer = require("multer");
const disk = multer.diskStorage({
	destination: (req, file, callback) => {
		callback(null, config.webroot + "/uploads");
	},
	filename: (req, file, callback) => {
		var linkHash = null;
		do linkHash = nanoid(5);
		while (linkHash in config.links);
		const filename = filenamify(linkHash + "-" + file.originalname);
		req.filename = filename;
		req.linkHash = linkHash;
		callback(null, filename);
	}
})
const upload = multer({
	storage: disk,
	fileFilter: (req, file, callback) => auth(req, callback)
});
const nanoid = require("nanoid");
const filenamify = require("filenamify");
const imageThumbnail = require("image-thumbnail");
const app = express();
app.use(express.static(config.webroot));
app.post("/list", upload.none(), (req, res, next) => {
	auth(req, (err, pass) => {
		if (!pass) {
			res.sendStatus(401);
			return;
		}
		const links = [];
		for (const hash in config.links) {
			links.push({
				src: config.links[hash],
				hash: hash,
				thumb: "t-" + config.links[hash]
			});
		}
		res.redirect("uploads?list=" + encodeURIComponent(btoa(JSON.stringify(links))));
	});
});
app.post("/upload",
	upload.single("upload"),
	(req, res, next) => {
		const path =config.webroot + "/uploads/" + req.filename;
		try {
			imageThumbnail(path, {
				width: 256,
				height: 256
			}).then(buf => fs.writeFile(config.webroot + "/uploads/t-" + req.filename, buf, ()=>{}));
			config.links[req.linkHash] = req.filename;
			saveConfig(config);
			res.redirect("uploads?list=" + encodeURIComponent(btoa(JSON.stringify([{
				src: path,
				hash: req.linkHash,
				thumb: "t-" + req.filename
			}]))));
		} catch (error) {
			//res.statusCode(500);
			res.send(error.toString());
		}
	});
app.get('/:id', (req, res) => {
	if (req.params.id in config.links) res.sendFile("uploads/" + config.links[req.params.id], {
		root: config.webroot
	});
	else res.sendStatus(404);
});
app.use(function (err, req, res, next) {
	res.send(err.message);
});
app.listen(8080);