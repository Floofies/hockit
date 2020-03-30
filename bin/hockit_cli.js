#!/usr/bin/env node
const jsonLoc = process.argv.indexOf("--json");
if (jsonLoc !== -1) {
	process.argv.splice(jsonLoc, 1);
	var tty = false;
} else var tty = process.stdout.isTTY;
const out = str => process.stdout.write(str + "\n");
function missing(name) {
	return "Syntax error. Missing " + name + " argument."
}
function helpPage() {
	console.log("Syntax: hockit <command> <argument>");
	console.log("\nGeneral Commands:");
	console.log("list\n\tLists all uploaded files and their hashes.");
	console.log("list <hash>\n\tLooks up a file by its hash.");
	console.log("delete <hash>\n\tDeletes a file using it's upload hash.");
	console.log("up <file>\n\tUploads a file and returns a shortlink.");
	console.log("start\n\tStarts the HockIt HTTP server on this session.");
	console.log("\nConfiguration Commands:");
	console.log("passwd <password>\n\tSets the password.");
	console.log("domain <uri>\n\tSets the FQDN or port number to bind with HTTP.");
	console.log("port <port|host|path>\n\tSets the port, host, or path to bind with HTTP..");
	console.log("webroot <path>\n\tServes files from given path via HTTP. Requires read & write permissions.");
}
if (process.argv.length >= 3) var argName = process.argv[2];
else var argName = null;
if (process.argv.length >= 4) var arg = process.argv[3];
else var arg = null;
if (process.argv.length >= 5) var arg2 = process.argv[4];
else var arg2 = null;
if (argName === null || argName === "help") {
	if (tty) helpPage();
	return;
}
const resolvePath = require('path').resolve;
if (argName === "start") {
	if (tty) console.log("Starting HockIt server");
	var server = require(__dirname + "/../src/httpd.js");
	var hockit = server.hockit;
	if (tty) {
		const readline = require("readline");
		const splitter = require("argv-split");
		const input = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		input.on("line", str => {
			const args = splitter(str);
			args.unshift(hockit);
			args.unshift(server);
			reactor.apply(null, args);
			process.stdout.write("> ");
		});
		process.stdout.write("> ");
	}
	return;
} else {
	var Hockit = require(__dirname + "/../index.js");
	var hockit = new Hockit();
	var server = null;
	reactor(server, hockit, argName, arg, arg2);
}
function reactor(server, hockit, argName, arg = null, arg2 = null) {
	if (argName === "exit") process.exit(0);
	if (argName === "help") {
		helpPage();
		return;
	}
	if (argName === "config") {
		if (tty && hockit.config.hash === "") console.warn("WARNING: Missing password; the web GUI will not work until you set a password with \"hockit passwd\"");
		if (tty) console.log("Current HockIt Configuration:");
		const table = {
			"WebRoot": (hockit.config.webroot === "") ? "Not Set. Default: " + hockit.webroot : hockit.config.webroot,
			"HTTP Port": hockit.config.port,
			"Domain Name": (hockit.config.fqdn === "") ? "Not Set" : hockit.config.fqdn,
			"SSL Key": (hockit.config.sslKey === "") ? "Not Set" : hockit.config.sslKey,
			"SSL Cert": (hockit.config.sslCert === "") ? "Not Set" : hockit.config.sslCert,
			"Password": (hockit.config.hash === "") ? "Not Set" : "Set",
			"Total Files": Object.keys(hockit.config.links).length,
			"Total API Tokens": Object.keys(hockit.config.tokens).length
		};
		if (tty) console.table(table);
		else out(JSON.stringify(table));
		return;
	}
	if (argName === "token") {
		if (arg === null) {
			const tokens = hockit.config.tokens;
			const total = tokens.length;
			if (tty) console.log(total + " valid HockIt REST API Tokens");
			if (total === 0) return;
			const table = {};
			for (const loc in tokens) table[tokens[loc][0]] = { Token: tokens[loc][1] };
			if (tty) console.table(table);
			else out(JSON.stringify(table));
			return;
		}
		if (arg === "find") {
			if (arg2 === null) {
				if (tty) console.error(missing("nickname"));
				else process.exit(9);
				return;
			}
			const token = hockit.findToken(arg2);
			if (token !== null) {
				if (tty) console.log("Valid API token found: \n\t" + token[0] + " -> " + token[1]);
				else out(token[1]);
			} else if (tty) console.error("No valid API token was found.");
			return;
		}
		if (arg === "revoke") {
			if (arg2 === null) {
				if (tty) console.error(missing("nickname"));
				else process.exit(9);
				return;
			}
			const token = hockit.findToken(arg2);
			if (token === null) {
				if (tty) console.error("No valid API token was found.");
				else process.exit(1);
				return;
			} else {
				if (tty) console.log("Invalidating API token: \n\t" + token[0] + " -> " + token[1]);
				hockit.revokeToken(arg2);
			}
			return;
		}
		if (arg === "create") {
			if (arg2 === null) {
				if (tty) console.error(missing("nickname"));
				else process.exit(9);
				return;
			}
			const token = hockit.findToken(arg2);
			if (pair !== null) {
				if (tty) console.error("Valid API token already exists: \n\t" + token[0] + " -> " + token[1]);
				else process.exit(1);
				return;
			}
			hockit.addToken(arg).then(token => {
				if (tty) console.log("Generated new HockIt REST API token.\n\t" + arg + " -> " + token);
				else out(token);
			}).catch(e => { throw e });
		}
	}
	if (argName === "passwd") {
		if (arg !== null) {
			if (tty) console.log("Setting new HockIt password.");
			hockit.setPassword(arg);
		} else {
			if (tty) console.warn("Unsetting HockIt password; the web GUI will not work until it is reset!");
			hockit.unsetPassword();
		}
		return;
	}
	if (argName === "webroot") {
		if (arg !== null) {
			if (tty) console.log("Setting HockIt webroot path to: " + arg);
			hockit.config.webroot = arg;
		} else {
			if (tty) console.log("Setting HockIt webroot to default: " + home + "/.hockit/webroot");
			hockit.config.webroot = "";
		}
		hockit.setupWebroot();
		hockit.saveConfig(hockit.config);
		return;
	}
	if (argName === "domain") {
		if (arg !== null) {
			if (tty) console.log("Setting HockIt domain name to " + arg);
			hockit.config.fqdn = arg;
			hockit.saveConfig(hockit.config);
		} else {
			if (tty) console.log("Setting HockIt domain name to nothing.");
			hockit.config.fqdn = "";
			hockit.saveConfig(hockit.config);
		}
		return;
	}
	if (argName === "port") {
		if (arg !== null) {
			if (tty) console.log("Setting HockIt port to " + arg);
			hockit.config.port = arg;
			hockit.saveConfig(hockit.config);
		} else if (tty) console.error(missing("port"));
		else process.exit(9);
		return;
	}
	if (argName === "ssl") {
		if (arg === "key") {
			if (arg2 === null) {
				if (tty) console.error(missing("PEM private key path"));
				else process.exit(9);
				return;
			}
			const key = arg2;
			if (tty) console.log("Setting SSL private key path to " + key);
			hockit.config.sslKey = key;
			hockit.saveConfig(hockit.config);
			return;
		} else if (arg === "cert") {
			if (arg2 === null) {
				if (tty) console.error(missing("PEM certificate"));
				else process.exit(9);
				return;
			}
			const cert = arg2;
			if (tty) console.log("Setting SSL certificate path to " + cert);
			hockit.config.sslCert = cert;
			hockit.saveConfig(hockit.config);
			return;
		}
		var keyStatus = true;
		var certStatus = true;
		function logStatus() {
			const ok = (keyStatus === true && certStatus === true);
			if (tty) {
				console.log("The HockIt SSL configuration status is " + (ok ? "OK:" : "INVALID:"));
				if (!ok) {
					console.log(keyStatus);
					console.log(certStatus);
				} else {
					console.log("SSL Private Key: " + hockit.config.sslKey);
					console.log("SSL Certificate: " + hockit.config.sslCert);
				}
				return;
			} else if (!ok) process.exit(1);
		}
		function checkCert() {
			if (hockit.config.sslCert === "") {
				certStatus = "The PEM SSL certificate is not set. Set it up with: hockit ssl cert <path>";
				logStatus();
			} else fs.access(hockit.config.sslCert, fs.constants.F_OK | fs.constants.R_OK, (err) => {
				if (err) certStatus = err.message;
				logStatus();
			});
		}
		if (hockit.config.sslKey === "") {
			keyStatus = "The PEM SSL private key is not set. Set it up with: hockit ssl key <path>";
			checkCert();
		} else fs.access(hockit.config.sslKey, fs.constants.F_OK | fs.constants.R_OK, (err) => {
			if (err) keyStatus = err.message;
			checkCert();
		});
		return;
	}
	if (argName === "list") {
		hockit.setupWebroot();
		if (arg === null) var list = hockit.list();
		else var list = hockit.find(arg);
		if (list.total === 0) {
			if (tty) console.log("0 files downloadable in " + resolvePath(hockit.webroot + "/uploads"));
			else process.exit(1);
		} else {
			if (hockit.config.fqdn === "") var host = "http://localhost";
			else var host = "http://" + hockit.config.fqdn + "";
			if (hockit.config.port !== 80) host += (":" + hockit.config.port);
			host += "/";
			if (tty) console.log(list.total + " files downloadable in " + resolvePath(hockit.webroot + "/uploads"));
			if (tty) console.log(list.files.map(file => "\t" + host + file.hash + " -> " + file.name).join("\n"));
			else out(JSON.stringify(list.files));
		}
		return;
	}
	if (argName === "delete") {
		hockit.setupWebroot();
		if (arg !== null) {
			if (!(arg in hockit.config.links)) {
				if (tty) console.log("File not found.");
				else process.exit(1);
				return;
			}
			if (tty) console.log("Deleting file " + arg + " -> " + hockit.config.links[arg].name);
			hockit.delete(arg);
		} else if (tty) console.error(missing("hash"));
		else process.exit(9);
		return;
	}
	if (argName === "up") {
		hockit.setupWebroot();
		if (arg !== null) {
			const path = arg;
			if (tty) console.log("Uploading file " + path);
			const hash = hockit.copy(path);
			if (tty) console.log("http://" + ((hockit.config.fqdn !== "") ? hockit.config.fqdn + "/" + hash : "localhost" + ((hockit.config.port !== 80) ? ":" + hockit.config.port : "") + "/" + hash));
			else out(hash);
		} else if (tty) console.error(missing("path"));
		else process.exit(9);
		return;
	}
	if (argName !== null) {
		if (tty) console.error("Syntax error. Unknown command.");
		else process.exit(9);
	}
}