// @flow

import dateFormat from 'dateformat';
import invariant from 'invariant';

// Javascript uses 0-indexed months which is weird??
function getDate(
  yearInput: number,
  monthInput: number,
  dayOfMonth: number,
): Date {
  return new Date(yearInput, monthInput - 1, dayOfMonth);
}

function padMonthOrDay(n: number): string | number {
  return n < 10 ? '0' + n : n;
}

function daysInMonth(year: number, month: number) {
  switch (month) {
    case 2:
      return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

function dateString(
  first: Date | number,
  month?: number,
  day?: number,
): string {
  if (arguments.length === 1) {
    return dateFormat(first, 'yyyy-mm-dd');
  } else if (arguments.length === 3) {
    invariant(month && day, 'month/day should be set in call to dateString');
    invariant(typeof first === 'number', 'first param should be a number');
    return `${first}-${padMonthOrDay(month)}-${padMonthOrDay(day)}`;
  }
  invariant(false, 'incorrect number of params passed to dateString');
}

function startDateForYearAndMonth(year: number, month: number): string {
  return dateString(year, month, 1);
}

function endDateForYearAndMonth(year: number, month: number): string {
  return dateString(year, month, daysInMonth(year, month));
}

function fifteenDaysEarlier(timeZone?: ?string): string {
  const earlier = currentDateInTimeZone(timeZone);
  earlier.setDate(earlier.getDate() - 15);
  return dateString(earlier);
}

function fifteenDaysLater(timeZone?: ?string): string {
  const later = currentDateInTimeZone(timeZone);
  later.setDate(later.getDate() + 15);
  return dateString(later);
}

function prettyDate(dayString: string): string {
  return dateFormat(dateFromString(dayString), 'dddd, mmmm dS, yyyy');
}

function prettyDateWithoutDay(dayString: string): string {
  return dateFormat(dateFromString(dayString), 'mmmm dS, yyyy');
}

function prettyDateWithoutYear(dayString: string): string {
  return dateFormat(dateFromString(dayString), 'dddd, mmmm dS');
}

function dateFromString(dayString: string): Date {
  const matches = dayString.match(/^([0-9]+)-([0-1][0-9])-([0-3][0-9])$/);
  invariant(matches && matches.length === 4, `invalid dayString ${dayString}`);
  return getDate(
    parseInt(matches[1], 10),
    parseInt(matches[2], 10),
    parseInt(matches[3], 10),
  );
}

const millisecondsInDay = 24 * 60 * 60 * 1000;
const millisecondsInWeek = millisecondsInDay * 7;
const millisecondsInYear = millisecondsInDay * 365;

// Takes a millisecond timestamp and displays the time in the local timezone
function shortAbsoluteDate(timestamp: number): string {
  const now = Date.now();
  const msSince = now - timestamp;
  const date = new Date(timestamp);
  if (msSince < millisecondsInDay) {
    return dateFormat(date, 'h:MM TT');
  } else if (msSince < millisecondsInWeek) {
    return dateFormat(date, 'ddd');
  } else if (msSince < millisecondsInYear) {
    return dateFormat(date, 'mmm d');
  } else {
    return dateFormat(date, 'mmm d yyyy');
  }
}

// Same as above, but longer
function longAbsoluteDate(timestamp: number): string {
  const now = Date.now();
  const msSince = now - timestamp;
  const date = new Date(timestamp);
  if (msSince < millisecondsInDay) {
    return dateFormat(date, 'h:MM TT');
  } else if (msSince < millisecondsInWeek) {
    return dateFormat(date, 'ddd h:MM TT');
  } else if (msSince < millisecondsInYear) {
    return dateFormat(date, 'mmmm d, h:MM TT');
  } else {
    return dateFormat(date, 'mmmm d yyyy, h:MM TT');
  }
}

function thisMonthDates(timeZone?: ?string): {
  startDate: string,
  endDate: string,
} {
  const now = currentDateInTimeZone(timeZone);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return {
    startDate: startDateForYearAndMonth(year, month),
    endDate: endDateForYearAndMonth(year, month),
  };
}

// The Date object doesn't support time zones, and is hardcoded to the server's
// time zone. Thus, the best way to convert Date between time zones is to offset
// the Date by the difference between the time zones
function changeTimeZone(date: Date, timeZone: ?string): Date {
  if (!timeZone) {
    return date;
  }
  const localeString = date.toLocaleString('en-US', { timeZone });
  const localeDate = new Date(localeString);
  const diff = localeDate.getTime() - date.getTime();
  return new Date(date.getTime() + diff);
}

function currentDateInTimeZone(timeZone: ?string): Date {
  return changeTimeZone(new Date(), timeZone);
}

const threeDays = millisecondsInDay * 3;

export {
  getDate,
  padMonthOrDay,
  dateString,
  startDateForYearAndMonth,
  endDateForYearAndMonth,
  fifteenDaysEarlier,
  fifteenDaysLater,
  prettyDate,
  prettyDateWithoutDay,
  prettyDateWithoutYear,
  dateFromString,
  shortAbsoluteDate,
  longAbsoluteDate,
  thisMonthDates,
  currentDateInTimeZone,
  threeDays,
};
