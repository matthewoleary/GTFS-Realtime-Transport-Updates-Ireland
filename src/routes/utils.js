'use-strict';

/* eslint-disable import/no-unassigned-import, no-unused-vars, unicorn/no-for-loop  */
const moment = require('moment');
require('moment/locale/en-ie');
moment.locale('en-ie');

// Get seconds since midnight
const getCurrentTimestamp = async => {
	let time = moment().format('LTS').split(':');
	time = (Number(time[0]) * 3600) + (Number(time[1]) * 60) + Number(time[2]);
	return time;
};

const getUnixTimestamp = async => {
	return moment().unix();
};

const getTimestampMinusNumberMinutes = async (timestamp, numberMinutes) => {
	const numberSeconds = numberMinutes * 60;
	return timestamp - numberSeconds;
};

const getCurrentTimestampPlusOneHour = async => {
	let time = moment().add(1, 'h').format('LTS').split(':');
	time = (Number(time[0]) * 3600) + (Number(time[1]) * 60) + Number(time[2]);
	return time;
};

const getCurrentDate = async => {
	return moment().format('YYYYMMDD');
};

const getCurrentDay = async => {
	return moment().format('dddd');
};

const getWrappedDate = async => {
	return moment().subtract(1, 'd').format('YYYYMMDD');
};

const getWrappedDay = async => {
	return moment().subtract(1, 'd').format('dddd');
};

const getNextDayDate = async => {
	return moment().add(1, 'd').format('YYYYMMDD');
};

const getNextDay = async => {
	return moment().add(1, 'd').format('dddd');
};

// Check if time is between 00:00:00 and 05:59:59 (0 and 21009 seconds past midnight) - Latest wrapped departure time is 29:53:25 - 107075
const checkIfNightServices = async timeStamp => {
	if (timeStamp >= 0 && timeStamp <= 21599) {
		return true;
	}

	return false;
};

// If night services (between 00:00 and 05:59:59), we need to make a query using wrapped times
const getWrappedTimestamp = async timestamp => {
	if (timestamp <= 21599) {
		timestamp += (24 * 3600);
	}

	return timestamp;
};

// Remove trips that are last stop in stop_sequence
const removeTripsAtLastStop = async (lastStops, trips) => {
	for (let i = 0; i < lastStops.length; i++) {
		const lastStop = lastStops[i].recordset[0];
		if (lastStop.stop_sequence === trips[i].stop_sequence) {
			trips[i].last_stop = true;
		} else {
			trips[i].last_stop = false;
		}
	}

	return trips.filter(result => result.last_stop === false);
};

// Sort routes response by route short name as an integer; eg. route 1, 2, 3...
const sortByRouteShortNameAsInt = async routes => {
	return routes.sort((a, b) => parseInt(a.route_short_name) - parseInt(b.route_short_name));
}

module.exports = {
	getCurrentTimestamp,
	getCurrentTimestampPlusOneHour,
	getTimestampMinusNumMinutes: getTimestampMinusNumberMinutes,
	getWrappedTimestamp,
	getUnixTimestamp,
	getCurrentDate,
	getWrappedDate,
	getNextDayDate,
	getCurrentDay,
	getWrappedDay,
	getNextDay,
	checkIfNightServices,
	removeTripsAtLastStop,
	sortByRouteShortNameAsInt
};
