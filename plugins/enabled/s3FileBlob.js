// AWS S3 plugin for HockIt webroot
const { S3 } = require("aws-sdk");
const multerS3 = require("multer-s3-v3");
const { Datum } = require("../omnibus.js");
const s3Region = ("AWS_REGION" in process.env) ? process.env.AWS_REGION : "us-east-1";
const bucketName = ("AWS_S3_BUCKET_NAME" in process.env) ? process.env.AWS_S3 - BUCKET_NAME : "hockit-webroot";
const s3 = new S3({ region: s3Region });
const tty = process.stdout.isTTY;
const prod = process.env.NODE_ENV === "production";
// S3 is used as a webroot and to add/copy/delete user files.
async function initPlugin() {
	try {
		await s3.headBucket({
			Bucket: bucketName
		}).promise();
		if (!prod && tty) console.info("S3 Bucket successfully found!");
	} catch (e) {
		if (e.name !== "NoSuchBucket") throw e;
		await s3.createBucket({
			Bucket: bucketName,
			CreateBucketConfiguration: {
				LocationConstraint: s3Region
			}
		}).promise();
	}
}
const HTTPStorageDatum = new Datum("HTTPStorage",
	function () {
		return multerS3({
			s3: s3,
			bucket: bucketName,
			metadata: (req, file, set) => {
				set(null, { fieldName: file.fieldname });
			},
			key: (req, file, set) => {
				set(null, { fieldName: file.fieldname });
			}
		});
	}
);
const FileBlobDatum = new Datum("FileBlob",
	null,
	async function get(name) {
		try {
			return (await s3.getObject({
				Bucket: bucketName,
				Key: name
			}).promise()).body;
		} catch (e) {
			if (e.name === "NoSuchKey") return false;
			throw e;
		}
	},
	async function set(name, buf = null) {
		try {
			// Avoids overwriting existing files
			await s3.headObject({
				Bucket: bucketName,
				Key: name
			});
			return false;
		} catch (e) {
			if (e.name !== "NoSuchKey") throw e;
			const req = {
				Bucket: bucketName,
				Key: name
			};
			if (buf !== null) req.Body = buf;
			await s3.upload(req).promise();
			return true;
		}
	},
	async function del(name) {
		try {
			await s3.deleteObject({
				Bucket: bucketName,
				Key: name
			}).promise();
			return true;
		} catch (e) {
			if (e.name === "NoSuchKey") return false;
			throw e;
		}
	}
);
module.exports = {
	name: "S3FilePlugin",
	version: "1.0.0",
	initPlugin,
	FileBlobDatum,
	HTTPStorageDatum
};