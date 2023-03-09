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

function checkForMissingNatDevHostname() {
  if (!warnNatDevHostnameUndefined) {
    return;
  }
  console.warn(
    'Failed to read `natDevHostname` from Expo config. ' +
      'Please provide it manually by setting the `COMM_NAT_DEV_HOSTNAME` ' +
      'environment variable: `COMM_NAT_DEV_HOSTNAME=${hostname} yarn start`',
  );
  warnNatDevHostnameUndefined = false;
}

const natDevHostname: string =
  readHostnameFromExpoConfig() || defaultNatDevHostname;

export { natDevHostname, checkForMissingNatDevHostname };
