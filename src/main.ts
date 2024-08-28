import { resolve } from 'path';
import notify from 'sd-notify';
import { PROJECT_ROOT } from './common/constants';
import { IConfigFile, loadConfigFile } from './common/load-config';
import { flushCache } from './request/cache';
import { SubscriptionsLoader } from './request/load-subs';
import { startServer } from './server/index';

const configFile = resolve(PROJECT_ROOT, 'config.yaml');
const config: IConfigFile = {} as any;

function reloadConfig() {
	Object.assign(config, loadConfigFile(configFile));
}

export async function main() {
	reloadConfig();
	const loader = new SubscriptionsLoader(config);

	process.on('SIGTERM', () => {
		notify.sendState(['STATUS=shutdown']);
		loader.stopTimer();
		flushCache();
		process.exit(0);
	});
	process.on('SIGHUP', async () => {
		notify.sendState(['RELOADING=1']);
		loader.stopTimer();
		reloadConfig();
		await loader.workOnce();
		loader.startTimer();
		notify.ready();
	});

	console.log('正在启动……');
	await loader.initialize();

	await startServer(loader, config.server);

	notify.ready();
}
