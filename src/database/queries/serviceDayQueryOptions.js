/**
  * Represents options for a GTFS service day query (e.g., for night services).
*/
class ServiceDayQueryOptions {
  /**
   * @param {Object} options
   * @param {string} options.dayColumn - The name of the day column (e.g., 'monday').
   * @param {string} options.date - The service date in YYYYMMDD format.
   * @param {number} options.upperBoundTimestamp - The upper bound timestamp (in seconds).
   * @param {number} options.lowerBoundTimestamp - The lower bound timestamp (in seconds).
   */
  constructor({ dayColumn, date, upperBoundTimestamp, lowerBoundTimestamp }) {
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
