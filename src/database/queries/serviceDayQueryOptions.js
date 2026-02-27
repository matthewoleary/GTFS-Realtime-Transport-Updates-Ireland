/**
 * Represents options for a GTFS service day query (e.g., for night services).
 * All properties are required and must not be undefined.
 */
class ServiceDayQueryOptions {
  /**
   * @param {Object} options
   * @param {string} options.dayColumn - The name of the day column (e.g., 'monday'). Required.
   * @param {string} options.date - The service date in YYYYMMDD format. Required.
   * @param {number} options.upperBoundTimestamp - The upper bound timestamp (in seconds). Required.
   * @param {number} options.lowerBoundTimestamp - The lower bound timestamp (in seconds). Required.
   */
  constructor({ dayColumn, date, upperBoundTimestamp, lowerBoundTimestamp }) {
    if (
      dayColumn == null ||
      date == null ||
      upperBoundTimestamp == null ||
      lowerBoundTimestamp == null
    ) {
      throw new Error('All properties are required and cannot be undefined or null');
    }
    /**
     * The name of the day column (e.g., 'monday').
     * @type {string}
     */
    this.dayColumn = dayColumn;
    /**
     * The service date in YYYYMMDD format.
     * @type {string}
     */
    this.date = date;
    /**
     * The upper bound timestamp (in seconds).
     * @type {number}
     */
    this.upperBoundTimestamp = upperBoundTimestamp;
    /**
     * The lower bound timestamp (in seconds).
     * @type {number}
     */
    this.lowerBoundTimestamp = lowerBoundTimestamp;
  }
}

export default ServiceDayQueryOptions;
