# HockIt File Server

HockIt is super-simple file sharing server software written in NodeJS; it has a web GUI, a JSON API, and a CLI.

Documentation is currently a work-in-progress.

[![NPM](https://nodei.co/npm/hockit.png)](https://nodei.co/npm/hockit/)

# Install
Install the package globally to use the `hockit` command:

```
npm i -g hockit
```

Configure a password and webroot for hockit:

```
$ hockit passwd ChangeThisPassword
Setting new HockIt password
$ hockit port 8080
Setting HockIt port to 8080
$ hockit domain my.website.com
Setting HockIt domain name to my.website.com
$ hockit webroot /var/www
Setting HockIt webroot path to /var/www
```

Start the HTTP server:

```
$ hockit start
Starting HockIt server
```

# Hock it up there!

You can upload files via CLI in a Terminal, HTTP in a web browser, or via a REST API.

## Via HTTP

You can upload and list files via the web interface. In a web browser, navigate to port 80 or the port you set via `hockit port`. Before uploading & listing you should enter the password you set via `hockit passwd`.

## Via CLI

Uploading arbitrary files:

```
hockit up ~/Documents/hello.txt
http://my.website.com/p_9Gm
```

Uploading image files (this creates thumbnails):

```
hockit image ~/Pictures/mom.png
http://my.website.com/yu4kR
```

Deleting files:

```
hockit delete yu4kR
Deleting file yu4kR
```

## Via REST API

Hockit implements a traditional minimal REST API via the Get and Post HTTP request methods; responses are in JSON format.

URL Syntax: `my.website.com/<route/><data><?goto=<url>>`

- `/<hash>` If a file is found which matches the hash, then GET returns the binary data and DELETE deletes it. Returns HTTP error 404 if no file was found.
- `/up` Uploads a file to the server and redirects to `/uploads` to display it. Excpets the request body to contain data of type `multipart/form-data`.
- `/list` Lists all uploaded files and their hashes. Returns an array of objects with the properties `name`, and `hash`.
- `/list/<hash>` Lists a single file. Returns an object with the properties `name`, and `hash`.
- `/delete/<hash>`

# CLI Commands

Syntax: `hockit <command> <argument>`

- `passwd <password>` Sets the password for uploading/listing.
- `domain <uri>` Sets the FQDN to use in URLs.
- `port <uri>` Sets the port, host, or path to bind with HTTP.
- `webroot <path>` Serves files from given path via HTTP. Requires read & write permissions.
- `list` Lists all uploaded files and their hashes.
- `delete <hash>` tDeletes a file using it's upload hash.
- `up <path>` Uploads a file and returns a shortlink.
- `image <path>` Uploads an image file, generates a thumbnail, and returns a shortlink.
- `start` Starts an HTTP server on this session.