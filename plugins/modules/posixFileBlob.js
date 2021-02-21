// Local filesystem plugin
// Acts as the primary API between HockIt and a local POSIX-compliant filesystem.
const fs = require('fs');
const { Datum } = require("../omnibus.js");
const FileBlobDatum = new Datum("FileBlob",
	null,
	async function get(path) {
		return await fs.promises.readFile(path);
	},
	async function set(path, buf = null) {
		const leading = path.length === 0 ? false : path[path.length - 1] === "/";
		if (buf === null) {
			// Treats paths with leading slashes as directories.
			if (leading) return await fs.promises.mkdir(path);
			else return await fs.promises.writeFile(path);
		}
		else return await fs.promises.writeFile(path, buf);
	},
	async function del(path) {
		return await fs.promises.unlink(path);
	}
);
module.exports = {
	name: "POSIXFSPlugin",
	version: "1.0.0",
	FileBlobDatum
};