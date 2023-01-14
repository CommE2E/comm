// @flow
import Constants from 'expo-constants';

let warnNatDevHostnameUndefined = true;
const defaultNatDevHostname = '192.168.1.1';

function readHostnameFromExpoConfig(): ?string {
  const { natDevHostname: detectedHostname } = Constants.expoConfig.extra || {};
  if (!detectedHostname || typeof detectedHostname !== 'string') {
    return null;
  }
  warnNatDevHostnameUndefined = false;
  return detectedHostname;
}

function readHostnameFromNetworkJson(): string {
  try {
    // this is your machine's hostname in the local network
    // usually it looks like this: 192.168.1.x
    // to find it you may want to use `ifconfig | grep '192.168'`
    // command in the terminal
    // example of native/facts/network.json:
    // { "natDevHostname": "192.168.1.x" }
    // $FlowExpectedError: It's a conditional require so the file may not exist
    const hostname: string = require('../facts/network').natDevHostname;
    warnNatDevHostnameUndefined = false;
    return hostname;
  } catch (e) {
    return defaultNatDevHostname;
  }
}

const natDevHostname: string =
  readHostnameFromExpoConfig() ?? readHostnameFromNetworkJson();

function checkForMissingNatDevHostname() {
  if (!warnNatDevHostnameUndefined) {
    return;
  }
  console.warn(
    'Failed to autodetect natDevHostname. ' +
      'Please specify it manually in native/facts/network.json',
  );
  warnNatDevHostnameUndefined = false;
}

export { natDevHostname, checkForMissingNatDevHostname };
