// @flow

import dateFormat from 'dateformat';

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

function dateString(year: number, month: number, day: number) {
  return `${year}-${padMonthOrDay(month)}-${padMonthOrDay(day)}`;
}

function startDateForYearAndMonth(year: number, month: number) {
  return dateString(year, month, 1);
}

function endDateForYearAndMonth(year: number, month: number) {
  return dateString(year, month, daysInMonth(year, month));
}

function fifteenDaysEarlier() {
  const fifteenDaysEarlier = new Date();
  fifteenDaysEarlier.setDate(fifteenDaysEarlier.getDate() - 15);
  return dateFormat(fifteenDaysEarlier, "yyyy-mm-dd");
}

function fifteenDaysLater() {
  const fifteenDaysLater = new Date();
  fifteenDaysLater.setDate(fifteenDaysLater.getDate() + 15);
  return dateFormat(fifteenDaysLater, "yyyy-mm-dd");
}

export {
  getDate,
  padMonthOrDay,
  dateString,
  startDateForYearAndMonth,
  endDateForYearAndMonth,
  fifteenDaysEarlier,
  fifteenDaysLater,
}
