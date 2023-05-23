import { resolve } from 'path';
import notify from 'sd-notify';
import { PROJECT_ROOT } from './common/constants';
import { loadConfigFile } from './common/load-config';
import { SubscriptionsLoader } from './request/load-subs';
import { startServer } from './server/index';

export async function main() {
	const configFile = resolve(PROJECT_ROOT, 'config.yaml');
	const config = loadConfigFile(configFile);

	const loader = new SubscriptionsLoader(config);

	console.log('正在启动……');
	await loader.downloadOnce();
	console.log('首次下载成功');

	loader.startTimer();

	await startServer(loader, config.server);

	notify.ready();
}
