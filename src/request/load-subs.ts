import { DeepReadonly, oneHour, oneMinute } from '@idlebox/common';
import { dump, load } from 'js-yaml';
import notify from 'sd-notify';
import { IConfigFile } from '../common/load-config';
import { downloadFile, SkipError } from './http';

const downloadTimeoutUsec = 1.1 * oneMinute * 1000;

interface IProxyServer {
	name: string;
	[field: string]: any;
}

export class SubscriptionsLoader {
	private timer?: NodeJS.Timeout;
	private subscribes: Record<string /* sub name */, IProxyServer[]> = {};
	private readonly blackList: RegExp[] = [];

	private readonly defaultTimeout: number;

	constructor(public readonly config: DeepReadonly<IConfigFile>) {
		for (const item of config.blacklist) {
			let r;
			if (item.startsWith('/')) {
				const [, pattern, flag] = item.split('/');
				if (typeof pattern !== 'string' || typeof flag !== 'string') {
					throw new Error('invalid config: invalid regexp: ' + item);
				}
				r = new RegExp(pattern, flag);
			} else {
				r = new RegExp(item);
			}
			this.blackList.push(r);
		}

		this.defaultTimeout = config.timer * oneHour;

		console.log('更新间隔: %s 小时', config.timer);
	}

	private hitBlackList(title: string) {
		for (const r of this.blackList) {
			if (r.test(title)) return true;
		}
		return false;
	}

	stopTimer() {
		if (this.timer) {
			clearTimeout(this.timer);
			delete this.timer;
		}
	}

	startTimer(timeout = this.defaultTimeout) {
		this.stopTimer();

		this.timer = setTimeout(() => {
			delete this.timer;
			this.work(true, false);
		}, timeout);
	}

	toString() {
		const r: any = { proxies: [] };
		for (const [title, proxies] of Object.entries(this.subscribes)) {
			for (const item of proxies) {
				if (this.hitBlackList(item.name)) {
					// console.debug('drop:', name);
					continue;
				}
				r.proxies.push({
					...item,
					name: `[${title}]${item.name}`,
				});
			}
		}
		return dump(r, { indent: 2 });
	}

	public async initialize() {
		await this.work(true, true);
	}

	public async workOnce() {
		try {
			await this.work(false, false);
		} catch (e: any) {
			console.error('错误: %s', e.stack);
		}
	}

	private async work(schedule: boolean, offline: boolean) {
		let errors = 0;
		for (const { title, url } of this.config.subscriptions) {
			const r = [`STATUS=downloading ${title}`];
			if (!offline) r.push(`EXTEND_TIMEOUT_USEC=${downloadTimeoutUsec}`);
			notify.sendState(r);
			try {
				const content = await downloadFile({
					title,
					url,
					config: this.config.request,
					offline,
				});
				this.applyConfig(title, content);
			} catch (e: any) {
				errors++;
				if (e instanceof SkipError) {
					continue;
				}
				console.error('[%s] 错误: %s', title, e.message);
			}
		}

		if (errors === this.config.subscriptions.length) {
			notify.sendState(['STATUS=error']);

			if (offline) {
				console.error('空白缓存，强制初始化下载');
				await this.work(schedule, false);
				return;
			} else {
				console.error('全部订阅下载失败');
				notify.sendState(['STATUS=network issue']);
			}
		} else {
			notify.sendState(['STATUS=idle']);
		}

		if (schedule) {
			this.startTimer(offline ? 0 : this.defaultTimeout);
		}
	}

	private applyConfig(title: string, content: string) {
		const subFile = load(content) as any;
		if (!Array.isArray(subFile.proxies)) {
			delete this.subscribes[title];
			throw new Error('配置文件错误: proxies不是数组: ' + title);
		}

		this.subscribes[title] = subFile.proxies;
	}
}
