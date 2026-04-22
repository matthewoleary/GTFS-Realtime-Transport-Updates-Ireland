
import databaseClient from '../storage/database/databaseClient.js';

// When hapi registers plugins it passes the server instance to every plugin
export default {
	name: 'database',
	version: '1.0.0',
	register: async (server) => { 
		const config = server.app.config.sql;
		const databaseClientInstance = await databaseClient(server, config);
		// When hapi is initialising and registering all defined plugins, it will create a way to provide an instance of the plugins that can be accessed across the application
		// In this case we expose the database client, where we can get to it easily from any other routes
		server.expose('client', databaseClientInstance);
	}
};
