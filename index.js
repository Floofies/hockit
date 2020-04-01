const bcrypt = require("bcrypt");
const fs = require('fs');
const nanoid = require("nanoid").nanoid;
const filenamify = require("filenamify");
const imageThumbnail = require("image-thumbnail");
function Hockit(config = null) {
	this.homePath = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
	this.hockitPath = this.homePath + "/.hockit";
	this.defaultConfig = {
		webroot: this.hockitPath + "/webroot",
		port: 8080,
		fqdn: "",
		sslKey: "",
		sslCert: "",
		sslPass: "",
		links: {},
		tokens: [],
		hash: ""
	};
	try { fs.accessSync(this.hockitPath, fs.constants.F_OK | fs.constants.R_OK); }
	catch (_) { fs.mkdirSync(this.hockitPath); }
	if (config !== null) {
		this.config = config;
		return;
	}
	this.confPath = this.hockitPath + "/config.json";
	this.readConfig(this.confPath);
	if (this.config.webroot === "") this.webroot = this.homePath + "/.hockit/webroot";
	else this.webroot = this.config.webroot;
}
module.exports = Hockit;
const method = func => function (...args) {
	args.push(this.config);
	return func.apply(this, args);
};
Hockit.prototype.saveConfig = saveConfig;
Hockit.prototype.resetConfig = resetConfig;
Hockit.prototype.readConfig = readConfig;
Hockit.prototype.watchConfig = watchConfig;
Hockit.prototype.setPassword = method(setPassword);
Hockit.prototype.unsetPassword = method(unsetPassword);
Hockit.prototype.up = method(addFile);
Hockit.prototype.copy = method(copyFile);
Hockit.prototype.delete = method(delFile);
Hockit.prototype.list = method(getLinks);
Hockit.prototype.find = method(getLink);
Hockit.prototype.addToken = method(createToken);
Hockit.prototype.revokeToken = method(revokeToken);
Hockit.prototype.findToken = method(findToken);
Hockit.prototype.listTokens = method(listTokens);
Hockit.prototype.setupWebroot = method(setupWebroot);
Hockit.prototype.startServer = method(startServer);
var confLock = false;
function saveConfig(config) {
	confLock = true;
	fs.writeFileSync(this.confPath, JSON.stringify(config));
	this.config = config;
}
function resetConfig() {
	this.saveConfig(Object.assign({}, this.defaultConfig));
}
function readConfig(confPath) {
	var confJson = null;
	try {
		fs.accessSync(confPath, fs.constants.F_OK | fs.constants.R_OK);
		confJson = fs.readFileSync(confPath).toString("utf8");
		if (!confJson) throw new TypeError();
		this.config = JSON.parse(confJson);
		const keys = Object.keys(this.config);
		var missingKey = false;
		Object.keys(this.defaultConfig).forEach(key => {
			if (!keys.includes(key)) {
				this.config[key] = this.defaultConfig[key];
				missingKey = true;
			}
		});
		if (missingKey) this.saveConfig(this.config);
	} catch (err) {
		if (err.code === "ENOENT") this.resetConfig();
		else throw err;
	};
	this.ssl = (this.config.sslCert !== "" && this.config.sslKey !== "");
}
function watchConfig(confPath) {
	fs.watch(confPath, { persistent: false }, type => {
		if (type !== "change") return;
		if (confLock) {
			confLock = false;
			return;
		}
		readConfig(confPath);
	});
}
function setPassword(password, config) {
	bcrypt.hash(password, 10, (e, hash) => {
		config.hash = hash;
		this.saveConfig(config);
	});
}
function unsetPassword(config) {
	config.hash = "";
	this.saveConfig(config);
}
function setupWebroot(config) {
	const webroot = this.webroot;
	try { fs.accessSync(webroot, fs.constants.F_OK | fs.constants.R_OK); }
	catch (err) { fs.mkdirSync(webroot, { recursive: true }); }
	try { fs.accessSync(webroot + "/index.html", fs.constants.F_OK | fs.constants.R_OK); }
	catch (_) { fs.copyFileSync(__dirname + "/webroot/index.html", webroot + "/index.html"); }
	try { fs.accessSync(webroot + "/uploads", fs.constants.F_OK | fs.constants.R_OK); }
	catch (_) { fs.mkdirSync(webroot + "/uploads"); }
	try { fs.accessSync(webroot + "/uploads/index.html", fs.constants.F_OK | fs.constants.R_OK); }
	catch (_) { fs.copyFileSync(__dirname + "/webroot/uploads/index.html", webroot + "/uploads/index.html"); }
	try { fs.accessSync(webroot + "/themes", fs.constants.F_OK | fs.constants.R_OK); }
	catch (_) { fs.mkdirSync(webroot + "/themes"); }
	const files = fs.readdirSync(__dirname + "/webroot/themes");
	for (const file of files) {
		try { fs.accessSync(webroot + "/themes/" + file, fs.constants.F_OK | fs.constants.R_OK); }
		catch (_) { fs.copyFileSync(__dirname + "/webroot/themes/" + file, webroot + "/themes/" + file); }
	}
}
function getHash(config) {
	var hash = null;
	do hash = nanoid(5);
	while (hash in config.links);
	return hash;
}
function copyFile(path, config) {
	const hash = getHash(config);
	const name = path.slice(path.lastIndexOf("/") + 1);
	const filename = filenamify(hash + "." + name);
	fs.copyFileSync(path, this.webroot + "/uploads/" + filename);
	imageThumbnail(path, {
		width: 256,
		height: 256
	}).then(buf => fs.writeFile(this.webroot + "/uploads/t-" + filename, buf, () => { })).catch(() => { });
	config.links[hash] = {
		name: name,
		hash: hash,
		date: Date.now()
	};
	this.saveConfig(config);
	return hash;
}
function addFile(buf, name, config) {
	const hash = getHash(config);
	const filename = filenamify(hash + "." + name);
	return new Promise((resolve, reject) => {
		const path = this.webroot + "/uploads";
		fs.writeFile(path + "/" + filename, buf, (err) => {
			if (err) {
				reject(err);
				return;
			}
			imageThumbnail(buf, {
				width: 256,
				height: 256
			}).then(buf => fs.writeFile(path + "/t-" + filename, buf, () => { })).catch(() => { }).then(() => {
				config.links[hash] = {
					name: name,
					hash: hash,
					date: Date.now()
				};
				this.saveConfig(config);
				resolve(hash);;
			});
		});
	});
}
function delFile(hash, config) {
	return new Promise((resolve, reject) => {
		if (!(hash in config.links)) reject(404);
		const link = config.links[hash];
		const fileName = hash + "." + link.name;
		fs.unlink(this.webroot + "/uploads/" + fileName, err => {
			if (err) {
				if (err.code === "ENOENT") {
					delete config.links[hash];
					this.saveConfig(config);
					return resolve();
				}
				return reject(err);
			}
			fs.unlink(this.webroot + "/uploads/t-" + fileName, (err) => { });
			delete config.links[hash];
			this.saveConfig(config);
			resolve();
		});
	});
}
function getLink(hash, config) {
	if (typeof hash !== "string" || !(hash in config.links)) return {
		files: [],
		total: Object.keys(config.links).length
	};
	return {
		files: [config.links[hash]],
		total: Object.keys(config.links).length
	};
}
function getLinks(config) {
	const links = [];
	for (const hash in config.links) {
		links.push({
			name: config.links[hash].name,
			hash: hash,
			date: config.links[hash].date
		});
	}
	return {
		files: links,
		total: Object.keys(config.links).length
	};
}
function findToken(name, config) {
	const token = config.tokens.find(pair => pair[0] === name);
	return (typeof token !== "undefined") ? token : null;
}
function listTokens(config) {
	return [].concat(config.tokens);
}
function revokeToken(name, config) {
	config.tokens.splice(config.tokens.findIndex(pair => pair[0] === name), 1);
	this.saveConfig(config);
}
function createToken(name, config) {
	return new Promise((resolve, reject) => {
		bcrypt.genSalt(10, (e, token) => {
			if (e) throw e;
			config.tokens.push([
				name,
				token
			]);
			this.saveConfig(config);
			resolve(token);
		});
	});
}
function startServer() {
	return require(__dirname + "/src/httpd.js")(this);
}