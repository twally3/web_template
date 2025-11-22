import * as path from 'node:path';
import * as http from 'node:http';
import * as fs from 'node:fs';
import { StringDecoder } from 'node:string_decoder';
import * as stream from 'node:stream';

const APP_PATH = path.join(process.cwd(), './public');
const PORT = 8080;
const MIME_TYPES = {
	default: 'application/octet-stream',
	html: 'text/html; charset=UTF-8',
	js: 'text/javascript',
	mjs: 'text/javascript',
	css: 'text/css',
	png: 'image/png',
	jpg: 'image/jpeg',
	gif: 'image/gif',
	ico: 'image/x-icon',
	svg: 'image/svg+xml',
	json: 'application/json',
};
const RELOAD_SCRIPT = `<script src="/api/watch/script"></script>`;
const RELOAD_SCRIPT_BODY = `const e = new EventSource('/api/watch');
e.onmessage = e => {
	switch (e.data) {
		case 'reload': {
			window.location.reload();
			break;
		}
	}
};`;
const BODY_TAG = '</body>';

const server = http.createServer((req, res) => {
	if (req.url.startsWith('/api')) {
		switch (req.url) {
			case '/api/watch': {
				res.writeHead(200, {
					'content-type': 'text/event-stream',
					connection: 'keep-alive',
					'cache-control': 'no-cache',
					'access-control-allow-origin': '*',
				});

				const watcher = fs.watch('.', { recursive: true }, () => {
					res.write('data: reload\n\n');
				});

				req.on('close', () => {
					watcher.close();
				});

				break;
			}
			case '/api/watch/script': {
				res.writeHead(200, {
					'content-type': MIME_TYPES.js,
				});

				res.write(RELOAD_SCRIPT_BODY);
				res.end();

				break;
			}
			default: {
				res.writeHead(404);
				res.end();
			}
		}
	} else {
		const paths = [APP_PATH, req.url];
		if (req.url.endsWith('/')) {
			paths.push('index.html');
		}

		const filePath = path.join(...paths);

		if (!filePath.startsWith(APP_PATH)) {
			res.writeHead(404);
			res.end();
			return;
		}

		try {
			fs.accessSync(filePath, fs.constants.R_OK);
		} catch {
			res.writeHead(404);
			res.end();
			return;
		}

		const ext = path.extname(filePath).substring(1).toLowerCase();
		const mime = MIME_TYPES[ext] ?? MIME_TYPES.default;
		res.writeHead(200, {
			'content-type': mime,
			'Content-Security-Policy': "default-src 'self'",
		});
		const fileStream = fs.createReadStream(filePath, { highWaterMark: 8 });
		if (ext === 'html') {
			let buffer = '';
			let injected = false;
			const decoder = new StringDecoder('utf8');
			fileStream
				.pipe(
					new stream.Transform({
						transform(chunk, _encoding, callback) {
							if (injected) {
								this.push(chunk);
								return void callback();
							}

							buffer += decoder.write(chunk);
							const index = buffer.toLowerCase().indexOf(BODY_TAG);
							if (index !== -1) {
								this.push(Buffer.from(buffer.substring(0, index)));
								this.push(Buffer.from(RELOAD_SCRIPT));
								this.push(Buffer.from(buffer.substring(index)));
								injected = true;
							} else if (buffer.length >= BODY_TAG.length) {
								const flushPoint = Math.max(buffer.length - BODY_TAG.length, 0);
								this.push(Buffer.from(buffer.substring(0, flushPoint)));
								buffer = buffer.substring(flushPoint);
							}

							callback();
						},
					}),
				)
				.pipe(res);
		} else {
			fileStream.pipe(res);
		}
	}
});

server.listen(PORT, () => void console.log(`Listening on port: ${PORT}`));
