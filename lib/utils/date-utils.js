// @flow

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

export {
  getDate,
  padMonthOrDay,
  daysInMonth,
}
