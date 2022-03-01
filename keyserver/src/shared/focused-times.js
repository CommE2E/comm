// @flow

const fourHoursInMillis = 4 * 60 * 60 * 1000;

// If the time column for a given entry in the focused table has a time earlier
// than this, then that entry is considered expired, and consequently we will
// remove it from the table in the nightly cronjob.
function earliestFocusedTimeConsideredExpired(): number {
  return Date.now() - fourHoursInMillis;
}

export { earliestFocusedTimeConsideredExpired };
