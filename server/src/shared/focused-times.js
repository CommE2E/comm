// @flow

import { pingFrequency } from 'lib/shared/timeouts';

// If the time column for a given entry in the focused table has a time later
// than this, then that entry is considered current, and consequently the thread
// in question is considered in focus.
function earliestFocusedTimeConsideredCurrent(): number {
  return Date.now() - pingFrequency - 1500;
}

const fourHoursInMillis = 4 * 60 * 60 * 1000;

// If the time column for a given entry in the focused table has a time earlier
// than this, then that entry is considered expired, and consequently we will
// remove it from the table in the nightly cronjob.
function earliestFocusedTimeConsideredExpired(): number {
  return Date.now() - fourHoursInMillis;
}

export {
  earliestFocusedTimeConsideredCurrent,
  earliestFocusedTimeConsideredExpired,
};
