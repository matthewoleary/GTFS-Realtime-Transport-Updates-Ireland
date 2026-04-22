import { createRealtimeTripUpdatesClient } from '../services/realtime/clients/realtimeTripUpdatesClient.js';

export default {
	name: "realtimeTripUpdates",
	version: "2.0.0",
	register: async (server) => {
		const config = server.app.config.gtfsr;
		const realtimeTripUpdatesClient = await createRealtimeTripUpdatesClient(server, config);
		server.expose("realtimeTripUpdatesClient", realtimeTripUpdatesClient);
	}
};
