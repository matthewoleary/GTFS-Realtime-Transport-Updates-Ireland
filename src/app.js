import { server } from '@hapi/hapi';
import { register as pluginsRegister } from './plugins/index.js';
import { register as routesRegister } from './server/index.js';

const app = async config => {
	const { host, port } = config;

	const hapiServer = server({
		host,
		port,
		compression: {
			minBytes: 1024
		}
	});

	hapiServer.app.config = config;

	await pluginsRegister(hapiServer);
	await routesRegister(hapiServer);
	return hapiServer;
};

export default app;
