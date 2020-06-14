#!/usr/bin/env node
const marked = require("marked");
const markedman = require("marked-man");
const fs = require("fs");
function htmlEscapeToText(text) {
	return text.replace(/\&\#[0-9]*;|&amp;/g, function (escapeCode) {
		if (escapeCode.match(/amp/)) return '&';
		return String.fromCharCode(escapeCode.match(/[0-9]+/));
	});
}
function dup(char, num) {
	return (new Array(num)).fill(char).join("");
}
function renderText() {
	const renderer = new marked.Renderer();
	renderer.link = (href, title, text) => text;
	renderer.paragraph = text => htmlEscapeToText(text) + '\r\n';
	renderer.heading = (text, level) => "\r\n" + dup(" ", level) + text + "\r\n" + dup(" ", level) + dup("-", text.length) + "\r\n";
	renderer.image = () => '';
	return renderer;
}
const md = fs.readFileSync("manpage.md").toString();
fs.writeFileSync("man/hockit.1", markedman(md));
// marked-man sets the format to "roff", so lets set it back to "html".
marked.defaults.format = "html";
fs.writeFileSync("bin/manpage.txt", marked(md, { renderer: renderText() }).replace(/(\<\/code\>|\<code\>)/gi, " "));