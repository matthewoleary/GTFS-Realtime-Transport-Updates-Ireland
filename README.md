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
- `GET /api/agencies/{agencyId}` — Get details for a specific agency

### Routes
- `GET /api/routes` — List all routes (optionally filter by `?agencyId={agency_id}`)
- `GET /api/routes/{routeId}` — Get details for a specific route

### Stops
- `GET /api/stops` — List all stops (optionally filter by `?agencyId={agency_id}`)
- `GET /api/stops/{stopId}` — Get details for a specific stop

### Trips
- `GET /api/trips/{tripId}` — Get details for a specific trip

### Shapes
- `GET /api/shapes/{shapeId}` — Get details for a specific shape

### Trips At Stop
- `GET /api/stops/{stopId}/trips` — Get incoming trips at a stop (supports optional `lowerBoundMinutes` and `upperBoundMinutes` query params for time window)

### Stop Times
- `GET /api/trips/{tripId}/stopTimes` — Get stop times for a specific trip

---

## Testing

### Run Docker Test Database Container

```sh
docker-compose up -d gtfs-db-testing redis
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