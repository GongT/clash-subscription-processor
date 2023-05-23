import express from 'express';
import { IServerConfig } from '../common/load-config';
import { SubscriptionsLoader } from '../request/load-subs';

export async function startServer(loader: SubscriptionsLoader, config: IServerConfig) {
	const app = express();

	app.get('/', (_req, res) => {
		// todo:
		res.send('TODO');
	});

	app.get('/clash', (_req, res) => {
		res.header('Content-Type', 'text/plain; charset=utf-8');
		res.send(loader.toString());
	});

	await new Promise<void>((resolve) => {
		app.listen(config.port, '0.0.0.0', resolve);
	});

	console.log('server listening on port', config.port);
	console.log('   subscription: http://127.0.0.1:%s/clash', config.port);
	console.log('   status: http://127.0.0.1:%s/', config.port);
}
