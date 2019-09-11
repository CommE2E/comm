// @flow

import dateFormat from 'dateformat';
import invariant from 'invariant';

// Javascript uses 0-indexed months which is weird??
function getDate(
  yearInput: number,
  monthInput: number,
  dayOfMonth: number,
) {
  return new Date(yearInput, monthInput - 1, dayOfMonth);
}

function padMonthOrDay(n: number) {
  return (n < 10) ? ("0" + n) : n;
}

function daysInMonth(year: number, month: number) {
  switch (month) {
    case 2:
      return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
        ? 29
        : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

function dateString(first: Date | number, month?: number, day?: number) {
  if (arguments.length === 1) {
    return dateFormat(first, "yyyy-mm-dd");
  } else if (arguments.length === 3) {
    invariant(month && day, "month/day should be set in call to dateString");
    invariant(typeof first === 'number', "first param should be a number");
    return `${first}-${padMonthOrDay(month)}-${padMonthOrDay(day)}`;
  }
  invariant(false, "incorrect number of params passed to dateString");
}

function startDateForYearAndMonth(year: number, month: number) {
  return dateString(year, month, 1);
}

function endDateForYearAndMonth(year: number, month: number) {
  return dateString(year, month, daysInMonth(year, month));
}

function fifteenDaysEarlier(timeZone?: ?string) {
  const fifteenDaysEarlier = currentDateInTimeZone(timeZone);
  fifteenDaysEarlier.setDate(fifteenDaysEarlier.getDate() - 15);
  return dateString(fifteenDaysEarlier);
}

function fifteenDaysLater(timeZone?: ?string) {
  const fifteenDaysLater = currentDateInTimeZone(timeZone);
  fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);
  return dateString(fifteenDaysLater);
}

function prettyDate(dayString: string): string {
  return dateFormat(dateFromString(dayString), "dddd, mmmm dS, yyyy");
}

function dateFromString(dayString: string): Date {
  const matches = dayString.match(/^([0-9]+)-([0-1][0-9])-([0-3][0-9])$/);
  invariant(matches && matches.length === 4, `invalid dayString ${dayString}`);
  return getDate(
    parseInt(matches[1]),
    parseInt(matches[2]),
    parseInt(matches[3]),
  );
}

const millisecondsInDay = 24 * 60 * 60 * 1000;
const millisecondsInWeek = millisecondsInDay * 7;
const millisecondsInYear = millisecondsInDay * 365;

// Takes a millisecond timestamp and displays the time in the local timezone
function shortAbsoluteDate(timestamp: number) {
  const now = Date.now();
  const msSince = now - timestamp;
  if (msSince < millisecondsInDay) {
    return dateFormat(timestamp, "h:MM TT");
  } else if (msSince < millisecondsInWeek) {
    return dateFormat(timestamp, "ddd");
  } else if (msSince < millisecondsInYear) {
    return dateFormat(timestamp, "mmm d");
  } else {
    return dateFormat(timestamp, "mmm d yyyy");
  }
}

// Same as above, but longer
function longAbsoluteDate(timestamp: number) {
  const now = Date.now();
  const msSince = now - timestamp;
  if (msSince < millisecondsInDay) {
    return dateFormat(timestamp, "h:MM TT");
  } else if (msSince < millisecondsInWeek) {
    return dateFormat(timestamp, "ddd h:MM TT");
  } else if (msSince < millisecondsInYear) {
    return dateFormat(timestamp, "mmmm d, h:MM TT");
  } else {
    return dateFormat(timestamp, "mmmm d yyyy, h:MM TT");
  }
}

function thisMonthDates(
  timeZone?: ?string,
): {| startDate: string, endDate: string |} {
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
function changeTimeZone(date: Date, timeZone: string): Date {
  const localeString = date.toLocaleString('en-US', { timeZone });
  const localeDate = new Date(localeString);
  const diff = localeDate.getTime() - date.getTime();
  return new Date(date.getTime() + diff);
}

function currentDateInTimeZone(timeZone: ?string): Date {
  const localTime = new Date();
  return timeZone ? changeTimeZone(localTime, timeZone) : localTime;
}

export {
  getDate,
  padMonthOrDay,
  dateString,
  startDateForYearAndMonth,
  endDateForYearAndMonth,
  fifteenDaysEarlier,
  fifteenDaysLater,
  prettyDate,
  dateFromString,
  shortAbsoluteDate,
  longAbsoluteDate,
  thisMonthDates,
  currentDateInTimeZone,
}
