import { createClient } from 'redis';
import DatabaseLogger from './databaseLogger.js';

/**
 * RedisClient class for managing a Redis connection and basic operations with logging.
 * Handles connection, disconnection, and get/set operations with optional logging.
 */
class RedisClient {
	/**
	 * Creates a new RedisClient instance.
	 * @param {object} [options] - Options for redis.createClient and logger.
	 * @param {DatabaseLogger} [options.logger] - Optional logger instance for logging Redis operations.
	 */
	constructor(options = {}) {
		this.client = createClient(options);
		this.connected = false;
		this.connecting = false;
		this.logger = options.logger || new DatabaseLogger({ client: 'REDIS' });
		this.errorListenerAttached = false;
		this.attachErrorListener();
	}

	attachErrorListener() {
		if (!this.errorListenerAttached) {
			this.client.on('error', (err) => {
				this.logger.error(`Redis Client Error: ${err.code}`);
			});
			this.errorListenerAttached = true;
		}
	}

	/**
	 * Connects to the Redis server if not already connected.
	 * Logs connection events and errors.
	 * @returns {Promise<void>}
	 */
	async connect() {
		if (this.connected || this.connecting) return;
		this.connecting = true;
		try {
			await this.client.connect();
			this.connected = true;
			this.logger.info('Connected to Redis');
		} catch (err) {
			this.connected = false;
			this.logger.error(`Failed to connect to Redis: ${err.code}`);
			throw err;
		} finally {
			this.connecting = false;
		}
	}

	/**
	 * Disconnects from the Redis server if connected.
	 * Logs disconnection events and errors.
	 * @returns {Promise<void>}
	 */
	async disconnect() {
		if (this.connected) {
			try {
				await this.client.quit();
				this.logger.info('Disconnected from Redis');
			} catch (err) {
				this.logger.error(`Error disconnecting from Redis: ${err.code}`);
				throw err;
			}
			this.connected = false;
		}
	}

	/**
	 * Retrieves a value from Redis by key.
	 * Logs the GET operation and errors.
	 * @param {string} key - The key to retrieve from Redis.
	 * @returns {Promise<string|null>} - The value associated with the key, or null if not found.
	 */
	async get(key) {
		await this.connect();
		try {
			const value = await this.client.get(key);
			this.logger.query(`GET ${key}`);
			return value;
		} catch (err) {
			this.logger.error(`Redis GET error for key ${key}: ${err.code}`);
		}
	}

	/**
	 * Sets a value in Redis for a given key.
	 * Logs the SET operation and errors.
	 * @param {string} key - The key to set in Redis.
	 * @param {string} value - The value to set for the key.
	 * @param {object} [options] - Optional Redis set options (e.g., EX for expiry).
	 * @returns {Promise<void>}
	 */
	async set(key, value, options = {}) {
		await this.connect();
		try {
			await this.client.set(key, value, options);
			this.logger.query(`SET ${key}`);
		} catch (err) {
			this.logger.error(`Redis SET error for key ${key}: ${err.code}`);
		}
	}

	/**
	 * Deletes a key from Redis.
	 * Logs the DEL operation and errors.
	 * @param {string} key - The key to delete from Redis.
	 * @returns {Promise<void>}
	 */
	async del(key) {
		await this.connect();
		try {
			await this.client.del(key);
			this.logger.query(`DEL ${key}`);
		} catch (err) {
			this.logger.error(`Redis DEL error for key ${key}: ${err.code}`);
		}
	}
}

/**
 * Exposes a RedisClient instance for use as a Hapi plugin or general app utility.
 * Usage:
 *   const redis = await redisClient(server, config);
 *   redis.get(key), redis.set(key, value), etc.
 *
 * @param {object} server - The Hapi server instance (optional, for future extension).
 * @param {object} config - Configuration object for RedisClient (passed to constructor).
 * @returns {Promise<RedisClient>} The initialized RedisClient instance.
 */
export const redisClient = async (server, config = {}) => {
	const client = new RedisClient(config);
	await client.connect();
	return client;
};

export default redisClient;