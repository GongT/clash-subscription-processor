import { existsSync, writeFileSync } from 'fs';
import { IncomingMessage, request as request_http } from 'http';
import { request as request_https, RequestOptions } from 'https';
import { oneMinute } from '@idlebox/common';
import { CollectingStream } from '@idlebox/node';
import { ProxyAgent } from 'proxy-agent';
import { resolve } from 'path/posix';
import { APP_ROOT } from '../common/constants';
import { IRequestConfig } from '../common/load-config';

const cacheFile = resolve(APP_ROOT, 'cache.json');
interface IState {
	content: string;
	lastDownload: number;
}
const cache: Record<string, IState> = loadIfExists();

function createAgent(proxy: string) {
	return new ProxyAgent({
		getProxyForUrl() {
			return proxy;
		},
	});
}

export async function downloadFile(title: string, url: string, config: IRequestConfig) {
	if (Date.now() - cache[title]?.lastDownload < 5 * oneMinute) {
		console.log('下载订阅（%s） - 使用缓存', title);
		return cache[title].content;
	}

	try {
		return await _low(title, url, config.proxy || process.env.https_proxy || process.env.http_proxy);
	} catch {
		return await _low(title, url);
	}
}

async function _low(title: string, url: string, proxy?: string) {
	const u = new URL(url);
	let request;
	if (u.protocol === 'https:') {
		request = request_https;
	} else {
		request = request_http;
	}

	const options: RequestOptions = {
		method: 'GET',
		protocol: u.protocol,
		hostname: u.hostname,
		host: u.host,
		port: u.port,
		path: u.pathname + u.search,
		timeout: 5 * oneMinute,
		agent: proxy ? createAgent(proxy) : undefined,
		headers: {
			'User-Agent': 'GongT/subscribe-manager',
		},
	};

	const res = request(options);

	const p = new Promise<IncomingMessage>((resolve, reject) => {
		res.on('response', resolve);
		res.on('error', (e) => {
			console.error('下载订阅（%s） - 失败: %s', title, e.message);
			reject(e);
		});
	});

	res.end();

	const response = await p;
	console.log('下载订阅（%s） - %s %s', title, response.statusCode, response.statusMessage);

	const textColl = new CollectingStream(response);
	const text = await textColl.promise();

	commit(title, text);

	return text;
}

function loadIfExists(): Record<string, IState> {
	if (existsSync(cacheFile)) {
		try {
			return require(cacheFile);
		} catch (e) {
			console.error('磁盘缓存文件错误: ', e);
		}
	}
	return {};
}

function commit(name: string, content: string) {
	cache[name] = {
		content,
		lastDownload: Date.now(),
	};
	writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}
