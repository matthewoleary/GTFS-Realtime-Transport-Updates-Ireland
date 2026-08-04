import { createHash } from 'node:crypto';

const CACHE_CONTROL = 'public, max-age=0, must-revalidate';

/**
 * Creates a validator for a resource at a known database revision.
 *
 * The resource key scopes the validator to a particular representation, while
 * the database update time changes it whenever the underlying GTFS data changes.
 * Returns null when no valid revision is available, preventing stale 304 responses.
 *
 * @param {string} resourceKey - Stable identity for the requested resource.
 * @param {string|Date} databaseLastUpdated - Database revision timestamp.
 * @returns {{etag: string, modified: Date}|null} Hapi entity validator.
 */
export function createRevisionValidator(resourceKey, databaseLastUpdated) {
	if (!databaseLastUpdated) {
		return null;
	}

	const modified = new Date(databaseLastUpdated);
	if (Number.isNaN(modified.getTime())) {
		return null;
	}

	const etag = createHash('sha256')
		.update(`${resourceKey}:${modified.toISOString()}`)
		.digest('base64url');

	return { etag, modified };
}

/**
 * Creates a cacheable Hapi response with validators derived from the complete payload.
 *
 * @param {object} handler - Hapi response toolkit.
 * @param {object} payload - Stable response payload.
 * @param {{etag: string, modified: Date}|null} [validator] - Precomputed resource validator.
 * @returns {object} Hapi response object.
 */
export function createCacheableResponse(handler, payload, validator = null) {
	const etag = validator?.etag ?? createHash('sha256')
		.update(JSON.stringify(payload))
		.digest('base64url');
	const response = handler.response(payload)
		.etag(etag)
		.header('Cache-Control', CACHE_CONTROL);
	const lastModified = validator?.modified ?? new Date(payload.db_last_updated);

	if (payload.db_last_updated && !Number.isNaN(lastModified.getTime())) {
		response.header('Last-Modified', lastModified.toUTCString());
	}

	return response;
}
