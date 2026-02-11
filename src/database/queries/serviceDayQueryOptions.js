// ServiceDay.js
// Represents a service day for GTFS queries (e.g., for night services)

class ServiceDayQueryOptions {
  constructor({ dayColumn, date, upperBoundTimestamp, lowerBoundTimestamp }) {
    this.dayColumn = dayColumn;
    this.date = date;
    this.upperBoundTimestamp = upperBoundTimestamp;
    this.lowerBoundTimestamp = lowerBoundTimestamp;
  }
}

export default ServiceDayQueryOptions;
