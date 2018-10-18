// @flow

// We can't push yet, so we rely on pings to keep Redux state updated with the
// server. As a result, we do them fairly frequently (once every 3s) while the
// app is active and the user is logged in.
const pingFrequency = 3000; // in milliseconds

// If the time column for a given entry in the focused table has a time later
// than this, then that entry is considered current, and consequently the thread
// in question is considered in focus.
function earliestTimeConsideredCurrent() {
  return Date.now() - pingFrequency - 1500;
}

// If the time column for a given entry in the focused table has a time earlier
// than this, then that entry is considered expired, and consequently we will
// remove it from the table in the nightly cronjob.
function earliestTimeConsideredExpired() {
  return Date.now() - pingFrequency * 2 - 1500;
}

export {
  pingFrequency,
  earliestTimeConsideredCurrent,
  earliestTimeConsideredExpired,
};
