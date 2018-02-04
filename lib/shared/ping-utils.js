// @flow

// We can't push yet, so we rely on pings to keep Redux state updated with the
// server. As a result, we do them fairly frequently (once every 3s) while the
// app is active and the user is logged in.
const pingFrequency = 3000; // in milliseconds

function earliestTimeConsideredCurrent() {
  return Date.now() - pingFrequency - 1500;
}

export {
  pingFrequency,
  earliestTimeConsideredCurrent,
};
