// @flow

let natDevHostname: string;
let warnNatDevHostnameUndefined = true;
const defaultNatDevHostname = '192.168.1.1';

try {
  // this is your machine's hostname in the local network
  // usually it looks like this: 192.168.1.x
  // to find it you may want to use `ifconfig | grep '192.168'`
  // command in the terminal
  // example of native/facts/network.json:
  // { "natDevHostname": "192.168.1.x" }
  // $FlowExpectedError: That's a conditional require so the file may not exist
  const hostname: string = require('../facts/network').natDevHostname;
  natDevHostname = hostname;
  warnNatDevHostnameUndefined = false;
} catch (e) {
  natDevHostname = defaultNatDevHostname;
}

function checkForMissingNatDevHostname() {
  if (!warnNatDevHostnameUndefined) {
    return;
  }
  console.warn(
    'Failed to read natDevHostname. ' +
      'Please specify it in native/facts/network.json',
  );
  warnNatDevHostnameUndefined = false;
}

export { natDevHostname, checkForMissingNatDevHostname };
