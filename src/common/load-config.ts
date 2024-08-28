interface IConfigFileYaml {
	subscriptions?: Record<string, string>;
	blacklist?: string[];
	server?: IServerConfig;
	request?: IRequestConfig;
	timer?: number | string;
}

export interface ISubscription {
	url: string;
	title: string;
}

export interface IRequestConfig {
	proxy?: string;
}

export interface IServerConfig {
	port: number;
}

export interface IConfigFile {
	subscriptions: ISubscription[];
	blacklist: string[];
	server: IServerConfig;
	request: IRequestConfig;
	timer: number;
}
import { accessSync, constants, readFileSync } from 'fs';
import { load } from 'js-yaml';

export function loadConfigFile(file: string): IConfigFile {
	try {
		accessSync(file, constants.O_RDONLY);
	} catch {
		throw new Error('缺少配置文件（config.yaml）');
	}

	const r = load(readFileSync(file, 'utf-8')) as IConfigFileYaml;

	if (!r.blacklist) {
		throw new Error('配置文件缺少blacklist');
	}
	if (!r.subscriptions) {
		throw new Error('配置文件缺少subscriptions');
	}

	let timer = parseInt((r.timer as any) ?? 6);
	if (isNaN(timer)) {
		throw new Error('配置文件 timer 不正确');
	} else if (timer <= 0) {
		throw new Error('配置文件 timer 不能小于1');
	}

	const result: IConfigFile = {
		blacklist: r.blacklist,
		server: r.server || { port: 1234 },
		subscriptions: [],
		request: r.request || {},
		timer,
	};

	for (const [title, content] of Object.entries(r.subscriptions)) {
		const url = new URL(content);
		result.subscriptions.push({
			url: url.toString(),
			title,
		});
	}

	return result;
}
