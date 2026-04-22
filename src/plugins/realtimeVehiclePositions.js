import { createRealtimeVehiclePositionsClient } from '../services/realtime/clients/realtimeVehiclePositionsClient.js';

export default {
    name: "realtimeVehiclePositions",
    version: "1.0.0",
    register: async (server) => {
        const config = server.app.config.gtfsr;
        const realtimeVehiclePositionsClient = await createRealtimeVehiclePositionsClient(server, config);
        server.expose("realtimeVehiclePositionsClient", realtimeVehiclePositionsClient);
    }
};
