// MongoDB bootstrapper plugin for HockIt configuration data
const { Datum } = require("../omnibus.js");
const { MongoClient } = require("mongodb");
const mongoAddr = ("MONGODB_URI" in process.env) ? process.env.MONGODB_URI : null;
if (mongoAddr === null) throw new Error("Missing MongoDB Connection String!");
// Retrieves a Collection object from a DB object.
// If the Collection does not exist, then a new Collection is created.
// Throws an error if the Collection can't be created or retrieved.
async function getCollection(db, name) {
	try {
		const collection = await db.createCollection(name);
		return collection;
	} catch (e) {
		if (("codeName" in e) && e.codeName === "NamespaceExists") {
			return db.collection(name);
		} else throw e;
	}
}
var config = null;
async function initPlugin() {
	// Setup/Retrieve drivers for MongoDB Collections & Documents.
	const mongo = new MongoClient(mongoAddr);
	await mongo.connect();
	const db = mongo.db("hockitdb");
	// Allows Datums to insert/delete/modify MongoDB Collection Documents.
	// Whitelist of API Access Tokens and their expiration dates.
	config = getCollection(db, "hockit-config");
}
const BootConfigDatum = new Datum("BootConfig",
	null,
	async function get() {
		return await config.findOne();
	},
	async function set(newConfig) {
		await config.findOneAndReplace({}, newConfig);
	},
	async function del() {
		await config.findOneAndReplace({}, BootConfigDatum.make());
	},
);
module.exports = {
	name: "BootConfigMongoDBPlugin",
	version: "1.0.0",
	initPlugin,
	BootConfigDatum
};