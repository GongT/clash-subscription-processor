import 'source-map-support/register';
import { main } from './main';

main().catch((e) => {
	console.error('程序启动失败: ', e.stack);
});
