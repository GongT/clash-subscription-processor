import { oneMinute } from '@idlebox/common';
import { CollectingStream } from '@idlebox/node';
import { IncomingMessage, request as request_http } from 'http';
import { RequestOptions, request as request_https } from 'https';
import { ProxyAgent } from 'proxy-agent';
import { IRequestConfig } from '../common/load-config';
import { getCache, setCache } from './cache';

interface IState {
	content: string;
	lastDownload: number;
}

function createAgent(proxy: string) {
	return new ProxyAgent({
		getProxyForUrl() {
			return proxy;
		},
	});
}

export interface IDownloadOptions {
	title: string;
	url: string;
	config: IRequestConfig;
	offline: boolean;
}

export class SkipError extends Error {}

export async function downloadFile({ title, url, config, offline }: IDownloadOptions) {
	const cached = getCache<IState>(title);
	if (cached) {
		if (Date.now() - cached.lastDownload < 5 * oneMinute) {
			console.log('下载订阅 [%s] - 使用缓存', title);
			return cached.content;
		}
	}
	if (offline) {
		if (cached) {
			console.log('下载订阅 [%s] - 强制使用缓存', title);
			return cached.content;
		} else {
			throw new SkipError('跳过订阅 [%s]');
		}
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
		timeout: 1 * oneMinute,
		agent: proxy ? createAgent(proxy) : undefined,
		headers: {
			'User-Agent': 'GongT/subscribe-manager',
		},
	};

	const res = request(options);

	console.error(`[${title}] 下载订阅 (${proxy ?? '无代理'})`);

	const p = new Promise<IncomingMessage>((resolve, reject) => {
		res.on('response', resolve);
		res.on('error', (e) => {
			console.error(`[${title}] 失败: ${e.message}`);
			reject(e);
		});
	});

	res.end();

	const response = await p;
	console.error(`[${title}]   - ${response.statusCode} ${response.statusMessage}`);

	const textColl = new CollectingStream(response);
	const text = await textColl.promise();

	setCache(title, {
		content: text,
		lastDownload: Date.now(),
	} satisfies IState);

	return text;
}
