// @flow

let neynarKey: ?string = null;
try {
  // $FlowExpectedError: file might not exist
  const { key } = require('../facts/neynar.json');
  neynarKey = key;
} catch {}

export { neynarKey };
