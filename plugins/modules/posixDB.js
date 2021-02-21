const FR = fs.constants.F_OK | fs.constants.R_OK;
POSIXPlugin.confLock = false;
function saveConfig(config) {
	POSIXPlugin.confLock = true;
	fs.writeFileSync(this.confPath, JSON.stringify(config));
	this.config = config;
}
function resetConfig() {
	this.saveConfig(Object.assign({}, this.defaultConfig));
}
function readConfig(confPath) {
	var confJson = null;
	try {
		fs.accessSync(confPath, FR);
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
function findToken(name) {
	const token = config.tokens.find(pair => pair[0] === name);
	return (typeof token !== "undefined") ? token : null;
}
function listTokens() {
	return [].concat(config.tokens);
}
function revokeToken(name) {
	config.tokens.splice(config.tokens.findIndex(pair => pair[0] === name), 1);
}
function addToken(name) {
	const token = nanoid(32);
	config.tokens.push([
		name,
		token
	]);
	return token;
}
function copyFile(path) {
	const hash = getHash();
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
	return hash;
}
function addFile(buf, name) {
	const hash = getHash();
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
				resolve(hash);
			});
		});
	});
}
function delFile(hash) {
	return new Promise((resolve, reject) => {
		if (!(hash in config.links)) reject(404);
		const link = config.links[hash];
		const fileName = hash + "." + link.name;
		fs.unlink(this.webroot + "/uploads/" + fileName, err => {
			if (err) {
				if (err.code === "ENOENT") {
					delete config.links[hash];
					return resolve();
				}
				return reject(err);
			}
			fs.unlink(this.webroot + "/uploads/t-" + fileName, (err) => { });
			delete config.links[hash];
			resolve();
		});
	});
}
function getLink(hash) {
	if (typeof hash !== "string" || !(hash in config.links)) return {
		files: [],
		total: Object.keys(config.links).length
	};
	return {
		files: [config.links[hash]],
		total: Object.keys(config.links).length
	};
}
function getLinks() {
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