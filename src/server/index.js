
import { registerRoutes } from './api/index.js';

export async function register(server) {
	await registerRoutes(server);

	server.route({
		method: 'GET',
		path: '/',
		handler: async () => {
			return 'Server running';
		}
	});
}
