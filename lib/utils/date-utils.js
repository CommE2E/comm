// @flow

// Javascript uses 0-indexed months which is weird??
function getDate(
  yearInput: number,
  monthInput: number,
  dayOfMonth: number,
) {
  return new Date(yearInput, monthInput - 1, dayOfMonth);
}

export { getDate }
