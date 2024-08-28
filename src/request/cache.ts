import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path/posix';
import { CACHE_DIR } from '../common/constants';

const cacheFile = resolve(CACHE_DIR, 'cache.json');
const cache: Record<string, any> = {};
load_or_init();

export function getCache<T>(section: string): T | undefined {
	return cache[section];
}

let saveTimer: NodeJS.Timeout | undefined;
export function setCache(section: string, value: any) {
	cache[section] = value;

	if (!saveTimer) {
		saveTimer = setTimeout(() => {
			saveTimer = undefined;
			try {
				commit();
			} catch (e: unknown) {
				console.error('缓存写入失败: %s', e);
			}
		}, 5000);
	}
}

export function flushCache() {
	if (saveTimer) {
		clearTimeout(saveTimer);
	}
	commit();
}

function load_or_init() {
	console.error('缓存路径: %s', cacheFile);
	if (!existsSync(CACHE_DIR)) {
		mkdirSync(CACHE_DIR, { recursive: true });
	}
	if (existsSync(cacheFile)) {
		try {
			const data = JSON.parse(readFileSync(cacheFile, 'utf-8'));
			Object.assign(cache, data);
		} catch (e) {
			console.error('缓存文件错误: ', e);
			commit();
		}
	} else {
		console.error('初始化缓存文件');
		commit();
	}
}

function commit() {
	writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}
