// @flow

// While a socket is active (or for legacy clients, on every ping) we keep the
// rows in the focused table updated for the session. The server updates these
// rows every three seconds to keep them considered "active".
const focusedTableRefreshFrequency = 3000; // in milliseconds

// If the time column for a given entry in the focused table has a time later
// than this, then that entry is considered current, and consequently the thread
// in question is considered in focus.
function earliestFocusedTimeConsideredCurrent() {
  return Date.now() - focusedTableRefreshFrequency - 1500;
}

// If the time column for a given entry in the focused table has a time earlier
// than this, then that entry is considered expired, and consequently we will
// remove it from the table in the nightly cronjob.
function earliestFocusedTimeConsideredExpired() {
  return Date.now() - focusedTableRefreshFrequency * 2 - 1500;
}

export {
  focusedTableRefreshFrequency,
  earliestFocusedTimeConsideredCurrent,
  earliestFocusedTimeConsideredExpired,
};
