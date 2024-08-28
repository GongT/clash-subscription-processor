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
	blacklist: RegExp[];
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
	console.log('更新间隔: %s 小时', timer);

	const result: IConfigFile = {
		blacklist: compileRegList(r.blacklist),
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

function compileRegList(blacklist: readonly string[]) {
	const ret: RegExp[] = [];
	for (const item of blacklist) {
		let r: RegExp;
		if (item.startsWith('/')) {
			const [, pattern, flag] = item.split('/');
			if (typeof pattern !== 'string' || typeof flag !== 'string') {
				throw new Error('invalid config: invalid regexp: ' + item);
			}
			r = new RegExp(pattern, flag);
		} else {
			r = new RegExp(item);
		}
		ret.push(r);
	}
	return ret;
}
