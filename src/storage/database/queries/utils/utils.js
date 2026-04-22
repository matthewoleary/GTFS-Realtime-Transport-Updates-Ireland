// utils.js

// Shared utilities for query generators

const allowedDays = [
	'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export function validateDayColumn(dayColumn) {
	if (!allowedDays.includes(dayColumn)) {
		throw new Error('Invalid day column. Column is: ' + dayColumn);
	}
}

export function validateDateValue(dateValue) {
	if (!/^[0-9]{8}$/.test(String(dateValue))) {
		throw new Error('Invalid date value. Value is: ' + dateValue);
	}
}