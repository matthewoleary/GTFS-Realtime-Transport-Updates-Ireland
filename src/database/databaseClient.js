
import * as mysql2 from 'mysql2/promise';
import fs from 'fs';
import registerQueries from './queries/databaseQueriesProcessor.js';
import DatabaseLogger from './databaseLogger.js';

/**
 * DatabaseClient class for managing database connections and queries.
 * Handles instantiation of the correct database client (MySQL),
 * injects a DatabaseLogger for structured logging, and registers query handlers.
 *
 * Usage:
 *   const dbClient = new DatabaseClient(server, config);
 *   await dbClient.init();
 *   dbClient.queries // Registered queries
 *   dbClient.getConnection() // Get DB connection
 *   dbClient.closePool() // Close connection pool
 */

class DatabaseClient {
    /**
     * Constructs a new DatabaseClient instance.
     * @param {object} server - The server instance (e.g., Hapi server).
     * @param {object} config - Configuration object for the database client.
     */
    constructor(server, config) {
        this.server = server;
        this.config = config;
        this.pool = null;
        this.logger = new DatabaseLogger({ client: 'MYSQLDB' });
        this.queries = null;
    }

    /**
     * Initializes the database client, establishes a connection pool, and registers queries.
     * @returns {Promise<DatabaseClient>} The initialized DatabaseClient instance.
     */
    async init() {
        await this.connect();
        this.queries = await registerQueries({ sqlClient: this, getConnection: this.connect.bind(this) });
        return this;
    }

    /**
     * Sets a new logger instance for the database client.
     * @param {DatabaseLogger} logger - The logger to use.
     */
    setLogger(logger) {
        this.logger = logger;
    }

    /**
     * Establishes a connection pool to the MySQL database.
     * @returns {Promise<import('mysql2/promise').Pool>} The MySQL connection pool.
     */
    async connect() {
        try {
            if (this.pool) {
                return this.pool;
            }
            this.pool = mysql2.createPool({
                host: this.config.host,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database,
                infileStreamFactory: (filename) => fs.createReadStream(filename)
            });
            this.logger.success('Connection pool created.');
            return this.pool;
        } catch (error) {
            this.logger.error(error);
            this.pool = null;
        }
    }

    /**
     * Closes the MySQL connection pool.
     * @returns {Promise<void>}
     */
    async disconnect() {
        try {
            if (this.pool) {
                await this.pool.end((error) => {
                    if (error) {
                        this.logger.error(error);
                    }
                    this.logger.success('All connections to the pool have ended.');
                });
                this.pool = null;
            }
        } catch (error) {
            this.pool = null;
            this.logger.error(error);
        }
    }

    /**
     * Retrieves the latest update time from the feed_info table, if it exists.
     * @returns {Promise<*>} The latest update time or null if not available.
     */
    async getLastDbUpdate() {
        try {
            const cnx = await this.connect();
            this.logger.query('Checking if feed_info table exists.');
            const [tableCheck] = await cnx.query(`
                SELECT COUNT(*) AS table_exists 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'feed_info'
            `);
            if (tableCheck[0].table_exists === 0) {
                this.logger.query('feed_info table does not exist.');
                return null;
            }
            this.logger.query('Checking if feed_last_updated column exists.');
            const [columnCheck] = await cnx.query(`
                SELECT COUNT(*) AS column_exists 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'feed_info'
                AND COLUMN_NAME = 'feed_last_updated'
            `);
            if (columnCheck[0].column_exists === 0) {
                this.logger.query('feed_last_updated column does not exist.');
                return null;
            }
            this.logger.query('Getting latest update time from feed_info table.');
            const [rows] = await cnx.query(`
                SELECT MAX(feed_last_updated) AS last_update 
                FROM feed_info
            `);
            return rows[0].last_update;
        } catch (error) {
            this.logger.error(error);
            return null;
        }
    }
}


export const databaseClient = async (server, config) => {
    const dbClient = new DatabaseClient(server, config);
    await dbClient.init();
    return {
        queries: dbClient.queries,
        getConnection: dbClient.connect.bind(dbClient),
        closePool: dbClient.disconnect.bind(dbClient),
        getLastDbUpdate: dbClient.getLastDbUpdate.bind(dbClient)
    };
};

export default databaseClient;