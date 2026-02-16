
import moment from 'moment-timezone';
moment.tz.setDefault('Europe/Dublin');
moment.locale('en-ie');

export const getCurrentDate = async => {
	return moment().format('YYYYMMDD');
};

export const getCurrentDay = async => {
	return moment().format('dddd');
};

export const getPreviousDate = async => {
	return moment().subtract(1, 'd').format('YYYYMMDD');
};

export const getPreviousDay = async => {
	return moment().subtract(1, 'd').format('dddd');
};

export const getNextDayDate = async => {
	return moment().add(1, 'd').format('YYYYMMDD');
};

export const getNextDay = async => {
	return moment().add(1, 'd').format('dddd');
};