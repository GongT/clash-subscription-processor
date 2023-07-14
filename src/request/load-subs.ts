import { DeepReadonly, oneHour } from '@idlebox/common';
import { dump, load } from 'js-yaml';
import notify from 'sd-notify';
import { IConfigFile } from '../common/load-config';
import { downloadFile } from './http';

interface IProxy {
	name: string;
	[field: string]: any;
}

export class SubscriptionsLoader {
	private timer?: NodeJS.Timeout;
	private proxies: Record<string, IProxy> = {};
	private readonly blackList: RegExp[] = [];

	constructor(public readonly config: DeepReadonly<IConfigFile>) {
		for (const item of config.blacklist) {
			let r;
			if (item.startsWith('/')) {
				const [, pattern, flag] = item.split('/');
				r = new RegExp(pattern, flag);
			} else {
				r = new RegExp(item);
			}
			this.blackList.push(r);
		}
	}

	private hitBlackList(title: string) {
		for (const r of this.blackList) {
			if (r.test(title)) return true;
		}
		return false;
	}

	startTimer() {
		if (this.timer) clearTimeout(this.timer);

		this.timer = setTimeout(() => {
			delete this.timer;
			this.work(true).catch((e) => {
				console.error('本次下载失败: %s', e.stack);
			});
		}, 0.5 * oneHour);
	}

	toString() {
		const r: any = { proxies: [] };
		for (const [name, item] of Object.entries(this.proxies)) {
			if (this.hitBlackList(name)) {
				// console.debug('drop:', name);
				continue;
			}
			r.proxies.push(item);
		}
		return dump(r, { indent: 2 });
	}

	public downloadOnce() {
		return this.work(false);
	}

	private async work(schedule = false) {
		for (const { title, url } of this.config.subscriptions) {
			notify.sendState(['STATUS=downloading ' + title]);
			const content = await downloadFile(title, url, this.config.request);

			this.applyConfig(title, content);
		}
		notify.sendState(['STATUS=idle']);

		if (schedule) this.startTimer();
	}

	private applyConfig(title: string, content: string) {
		const subFile = load(content) as any;
		if (!Array.isArray(subFile.proxies)) {
			console.error('配置文件错误: proxies不是数组: ' + title);
			this.proxies = {};
			return;
		}

		this.proxies = {};
		const proxies: IProxy[] = subFile.proxies;
		for (const proxy of proxies) {
			const name = proxy.name;
			this.proxies[name] = proxy;
		}
	}
}
