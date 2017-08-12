#!/usr/bin/env node
"use strict";
let https = require('https');
let path = require('path');
let fs = require('fs');
let URL = require('url');
let child_process = require('child_process');

// Read args
let argv = {};
for (let ii = 2; ii < process.argv.length; ++ii) {
	if (process.argv[ii].substr(0, 2) === '--') {
		if (process.argv[ii + 1] === undefined || process.argv[ii + 1].substr(0, 2) === '--') {
			argv[process.argv[ii].substr(2)] = true;
		} else {
			argv[process.argv[ii].substr(2)] = process.argv[ii + 1];
		}
	}
}

// Usage
if (argv.local !== true && !argv.auth) {
	console.log('usage: '+ path.basename(process.argv[0])+ ' '+ path.basename(process.argv[1])+ ' --local | --auth "email:password"');
	process.exit();
}

// Watch git
function parseBranch(HEAD) {
	return HEAD === 'ref: refs/heads/master\n' ? 'master' : 'dev';
}
let branch = parseBranch(fs.readFileSync('.git/HEAD', 'utf8'));
!argv.local && fs.watch('.git', function(ev, file) {
	if (file === 'HEAD') {
		let tmp = parseBranch(fs.readFileSync('.git/HEAD', 'utf8'));
		if (tmp !== branch) {
			branch = tmp;
			console.log('Switching to: '+ branch);
		}
	}
});

// Read local code from disk
let modules = {};
function refreshLocalBranch() {
	modules = {};
	fs.readdirSync('.').forEach(function(file) {
		if (file !== 'sync.js' && /\.js$/.test(file)) {
			modules[file.replace( /\.js$/, '')] = fs.readFileSync(file, 'utf8');
		}
	});
	modules['last-push'] = 'module.exports='+ Date.now()+ ';';
}

// Watch for local changes
let pushTimeout;
fs.watch('.', function(ev, file) {
	if (file !== 'sync.js' && /\.js$/.test(file)) {
		try {
			modules[file.replace(/\.js$/, '')] = fs.readFileSync(file, 'utf8');
		} catch (err) {
			delete modules[file.replace(/\.js$/, '')];
		}
		modules['last-push'] = 'module.exports='+ Date.now()+ ';';
		schedulePush();
	}
});

// Push changes to screeps.com
let writeListener;
function schedulePush() {
	if (pushTimeout) {
		clearTimeout(pushTimeout);
	}
	pushTimeout = setTimeout(function() {
		pushTimeout = undefined;
		writeListener && writeListener();
	}, 50);
}

if (argv.local) {

	// Auto-generation of self-signed certificate
	let sslKey = new Promise(function(resolve, reject) {
		function generate() {
			child_process.execFile('openssl', [ 'genrsa', '-des3', '-out', 'sync.key', '-passout', 'pass:password', 2048 ], function(err, stdout, stderr) {
				if (err) {
					fs.unlink('sync.key', () => 0);
					return reject(err);
				}
				child_process.execFile('openssl', [ 'req', '-new', '-batch', '-subj', '/commonName=127.0.0.1', '-key', 'sync.key', '-out', 'sync.csr', '-passin', 'pass:password' ], function(err, stdout, stderr) {
					if (err) {
						fs.unlink('sync.key', () => 0);
						fs.unlink('sync.csr', () => 0);
						return reject(err);
					}
					child_process.execFile('openssl', [ 'x509', '-req', '-days', 3650, '-in', 'sync.csr', '-signkey', 'sync.key', '-out', 'sync.crt', '-passin', 'pass:password' ], function(err, stdout, stderr) {
						fs.unlink('sync.csr', () => 0);
						if (err) {
							fs.unlink('sync.key', () => 0);
							fs.unlink('sync.crt', () => 0);
							return reject(err);
						}
						fs.readFile('sync.key', function(err, key) {
							if (err) return reject(err);
							fs.readFile('sync.crt', function(err, cert) {
								if (err) return reject(err);
								resolve({ key, cert });
							});
						});
					});
				});
			});
		}
		fs.readFile('sync.key', function(err, key) {
			if (err) return generate();
			fs.readFile('sync.crt', function(err, cert) {
				if (err) return generate();
				resolve({ key, cert });
			});
		});
	});

	// This all runs in the browser
	let clientSide = function() {
		function wait() {
			if (document.evaluate("//div[contains(@class, 'console-messages-list')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) {
				// Grab reference to the commit button
				let buttons = Array.prototype.slice.call(document.body.getElementsByTagName('button')).filter(function(el) {
					return el.getAttribute('ng:disabled') === '!Script.dirty';
				});
				let commitButton = buttons[0];

				// Override lodash's cloneDeep which is called from inside the internal reset method
				let modules;
				_.cloneDeep = function(cloneDeep) {
					return function(obj) {
						if (obj && typeof obj.main === 'string' && modules) {
							// Monkey patch!
							return modules;
						}
						return cloneDeep.apply(this, arguments);
					};
				}(_.cloneDeep);

				// Wait for changes to local filesystem
				function update(now) {
					let req = new XMLHttpRequest;
					req.onreadystatechange = function() {
						if (req.readyState === 4) {
							if (req.status === 200) {
								modules = JSON.parse(req.responseText);
								commitButton.disabled = false;
								commitButton.click();
							}
							setTimeout(update.bind(this, false), req.status === 200 ? 0 : 1000);
						}
					};
					req.open('GET', '//127.0.0.1:9090/'+ (now ? 'get' : 'wait'), true);
					req.send();
				};
				update(true);

				// Look for console messages
				let sconsole = document.body.getElementsByClassName('console-messages-list')[0];
				let lastMessage;
				setInterval(function() {
					let nodes = sconsole.getElementsByClassName('console-message');
					let messages = [];
					let found = false;
					for (let ii = nodes.length - 1; ii >= 0; --ii) {
						let el = nodes[ii];
						let ts = el.getElementsByClassName('timestamp')[0];
						ts = ts && ts.firstChild.nodeValue;
						let msg = el.getElementsByTagName('span')[0].childNodes;
						let txt = '';
						for (let jj = 0; jj < msg.length; ++jj) {
							if (msg[jj].tagName === 'BR') {
								txt += '\n';
							} else if (msg[jj].tagName === 'ANONYMOUS') {
								msg = msg[jj].childNodes;
								jj = -1;
							} else {
								txt += msg[jj].nodeValue;
							}
						}
						if (lastMessage && txt === lastMessage[1] && ts === lastMessage[0]) {
							break;
						}
						messages.push([ts, txt]);
					}
					if (messages.length) {
						let req = new XMLHttpRequest;
						req.open('GET', '//127.0.0.1:9090/log?log='+ encodeURIComponent(JSON.stringify(messages.reverse())), true);
						req.send();
						lastMessage = messages[messages.length - 1];
					}
				}, 100);
			} else {
				setTimeout(wait, 100);
			}
		}
		wait();
	};

	// Localhost HTTP server
	sslKey.then(function(key) {
		let server = https.createServer({
			key: key.key,
			cert: key.cert,
			passphrase: 'password',
		}, function(req, res) {
			let path = URL.parse(req.url, true);
			switch (path.pathname) {
				case '/inject':
					res.writeHead(200, { 'Content-Type': 'text/javascript' });
					res.end('~'+ clientSide.toString()+ '()');
					break;

				case '/get':
				case '/wait':
					if (writeListener) {
						writeListener();
					}
					writeListener = function() {
						res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
						res.end(JSON.stringify(modules));
						writeListener = undefined;
					};
					if (req.url === '/get') {
						writeListener();
					}
					break;

				case '/log':
					res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
					res.end();
					let messages = JSON.parse(path.query.log);
					for (let ii = 0; ii < messages.length; ++ii) {
						if (messages[ii][0]) {
							let prefix = ' ';
							for (let jj = messages[ii][0].length; jj > 0; --jj) {
								prefix += ' ';
							}
							console.log(
								messages[ii][0],
								messages[ii][1].split(/\n/g).map(function(line, ii) {
									return (ii ? prefix : '')+ line;
								}).join('\n')
							);
						} else {
							console.log(messages[ii][1]);
						}
					}
					break;

				default:
					res.writeHead(400);
					res.end();
					break;
			}
		});
		server.timeout = 0;
		server.listen(9090);
		console.log(
			"If you haven't done this already, run this (for OS X):\n"+
			"sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain sync.crt\n\n"+
			"Paste this into JS debug console in Screeps (*not* the Screeps console):\n"+
			"var s = document.createElement('script');s.src='https://127.0.0.1:9090/inject';document.body.appendChild(s);"
		);
	}).catch(function(err) {
		process.nextTick(() => { throw err });
	});
} else {

	// Push new code via Screeps API
	writeListener = function() {
		let req = https.request({
			hostname: 'screeps.com',
			port: 443,
			path: '/api/user/code',
			method: 'POST',
			auth: argv.auth,
			headers: {
				'Content-Type': 'application/json; charset=utf-8'
			},
		});
		req.end(JSON.stringify({ branch: branch, modules: modules }));
		req.on('response', function(res) {
			console.log('HTTP Status '+ res.statusCode);
		});
	};
}

// Sync current code
refreshLocalBranch();
schedulePush();