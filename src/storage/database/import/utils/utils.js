/*
 * Pluralize a word based on count
 */
export function pluralize(word, count) {
	return count === 1 ? word : `${word}s`;
}

/*
 * Calculate seconds from midnight for HH:mm:ss / H:m:s
 */
export function calculateHourTimestamp(time) {
	const split = time.split(':').map(d => Number.parseInt(d, 10));
	if (split.length !== 3) {
		return null;
	}

	return (split[0] * 3600) + (split[1] * 60) + split[2];
}
