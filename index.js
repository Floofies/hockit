#!/usr/bin/env node
// HockIt V1
const bcrypt = require("bcrypt");
const fs = require('fs');
const path = require('path');
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
if (!process.argv[2]) {
	console.log("Syntax: hockit <command> <argument>");
	console.log("Commands: passwd <password> | domain <uri> | list | delete <hash> | up <file> | start\n");
	console.log("passwd <password>\n\tSets the password.");
	console.log("domain <uri>\n\tSets the FQDN or port number to bind with HTTP.");
	console.log("list\n\tLists all uploaded files and their hashes.");
	console.log("delete <hash>\n\tDeletes a file using it's upload hash.");
	console.log("up <file>\n\tUploads a file and returns a shortlink hash. (Not Implemented)");
	console.log("start\n\tStarts an HTTP server on this session.");
	return;
}
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
} else if (argName === "list") {
	var list = [];
	for (const hash in config.links) list.push("\t" + hash + " -> " + config.links[hash] + "\n");
	console.log(list.length + " files downloadable in " + path.resolve(config.webroot + "/uploads"));
	if (list.length > 0) console.log(list.join(""));
} else if (argName === "delete") {
	if (process.argv[3]) {
		if (!(String(process.argv[3]) in config.links)) return console.log("No file found.");
		console.log("Deleting file " + process.argv[3]);
		fs.unlink(config.webroot + "/uploads/" + config.links[process.argv[3]], () => { });
		fs.unlink(config.webroot + "/uploads/t-" + config.links[process.argv[3]], () => { });
		delete config.links[process.argv[3]];
		saveConfig(config);
	}
} else if (argName === "up") {
	console.log("Not implemented yet.");
}
if (process.argv[2] !== "start") return;
if (config.hash === "") return console.log("Missing password! Set up password with the \"passwd\" argument.");
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
var btoa = v => Buffer.from(v).toString("base64");
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
				name: config.links[hash].slice(config.links[hash].indexOf("-") + 1),
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
		const path = config.webroot + "/uploads/" + req.filename;
		try {
			if (req.body.image) {
				imageThumbnail(path, {
					width: 256,
					height: 256
				}).then(buf => fs.writeFile(config.webroot + "/uploads/t-" + req.filename, buf, () => { }));
			}
			config.links[req.linkHash] = req.filename;
			saveConfig(config);
			res.redirect("uploads?list=" + encodeURIComponent(btoa(JSON.stringify([{
				name: req.file.originalname,
				hash: req.linkHash,
				thumb: req.body.image ? "t-" + req.filename : "/file-download-outline.png"
			}]))));
		} catch (error) {
			console.error(error);
			res.sendStatus(500);
		}
	});
app.get('/:id', (req, res) => {
	if (req.params.id in config.links) res.sendFile("uploads/" + config.links[req.params.id], {
		root: config.webroot
	});
	else res.sendStatus(404);
});
app.use(function (err, req, res, next) {
	res.status(500).send(err.message);
});
app.listen(config.fqdn ? config.fqdn : 8080);