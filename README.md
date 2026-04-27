# Realtime-Transport-Updates-API

A Node.js API for serving static GTFS schedule data and real-time public transport updates for Irish transit agencies, using MySQL (or compatible) as a backend and Redis for caching. The API supports robust cache/DB fallback and exposes endpoints for agencies, routes, stops, trips, shapes, and more, with real-time GTFS-R integration.

---

## Features
- Loads GTFS static data into MySQL (or compatible) via Docker
- Integrates with the Transport for Ireland GTFS-Realtime API for live updates
- REST API endpoints for agencies, routes, stops, trips, shapes, and more
- Redis-based caching with DB fallback for reliability
- Fully tested with Vitest, supporting both cache and DB-only scenarios

---

## Requirements
- Node.js >=20.19.0
- Docker & Docker Compose

---

## Setup

### 1. Clone the Repository
```sh
git clone <repo-url>
cd Realtime-Transport-Updates-API
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your MySQL and GTFS-R API credentials. 

Set your agency and GTFS feed URL using `GTFS_AGENCY_KEY` and `GTFS_SCHEDULE_URL` (used by the importer configuration in `src/storage/database/config.js`). 

Then run:
```sh
cp .env.example .env
```

### 3. Start Docker Containers
This will start MySQL and Redis containers as defined in `docker-compose.yml`:
```sh
docker-compose up -d
```

### 4. Run the application 
Then run:
```sh
npm start
```
The API will be available at `http://localhost:3000` by default.

---

## API Endpoints


All endpoints return JSON and support both static and real-time data where available.

### Agencies
- `GET /api/agencies` — List all agencies
- `GET /api/agencies?agencyId={agency_id}` — Get one or more agencies by ID (comma-separated or repeated agencyId params supported)

- If `agencyId` is provided, returns details for the specified agency/agencies only.
- If not provided, returns all agencies.

### Routes
- `GET /api/routes` — List all routes
- `GET /api/routes?routeId={route_id}` — Get one or more routes by ID (comma-separated or repeated routeId params supported)
- `GET /api/routes?agencyId={agency_id}` — Get all routes for a specific agency

- If `routeId` is provided, returns details for the specified route(s) only.
- If only `agencyId` is provided, returns all routes for that agency.
- If neither is provided, returns all routes.
- If both are provided, only `routeId` is used.

### Stops
- `GET /api/stops` — List all stops
- `GET /api/stops?stopId={stop_id}` — Get one or more stops by ID (comma-separated or repeated stopId params supported)
- `GET /api/stops?agencyId={agency_id}` — Get all stops for a specific agency

- If `stopId` is provided, returns details for the specified stop(s) only.
- If only `agencyId` is provided, returns all stops for that agency.
- If neither is provided, returns all stops.
- If both are provided, only `stopId` is used.

### Trips
- `GET /api/trips?tripId={trip_id}` — Get one or more trips by ID (comma-separated or repeated tripId params supported; required)

- `tripId` is required. Returns details for the specified trip(s) only.

### Shapes
- `GET /api/shapes?shapeId={shape_id}` — Get one or more shapes by ID (comma-separated or repeated shapeId params supported; required)

- `shapeId` is required. Returns details for the specified shape(s) only.

### Trips At Stop
- `GET /api/tripsAtStop?stopId={stop_id}` — Get incoming trips at one or more stops (comma-separated or repeated stopId params supported; required, with real-time updates)

- `stopId` is required. Returns incoming trips for the specified stop(s), including real-time updates. Supports single, comma-separated, or repeated stopId values.

### Stop Times
Stop Times endpoint supports flexible queries:
- `GET /api/stopTimes?tripId={trip_id}` — Get stop times for one or more trips (comma-separated or repeated tripId params supported; required)

- `tripId` is required. Returns stop times for the specified trip(s). Supports single, comma-separated, or repeated tripId values.

---

## Testing

### Run Docker Test Database Container

``` sh
docker-compose --profile testing up -d
```

### Run All Tests
```sh
npm test
```

### Linting
```sh
npm run lint
```

---

## Notes
- For real-time data, you must provide a valid GTFS-R API key in your `.env` file.
- The API is designed for Irish TFI GTFS feeds but can be adapted for other regions with minor changes.

---

## License
MIT