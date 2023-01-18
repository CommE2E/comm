/* eslint-disable flowtype/require-valid-file-annotation */

import ip from 'internal-ip';

// Finds this machine's hostname in the local network. This is useful for
// debugging on a real device. The `COMM_DEV` environment variable must be set
// or this function will return `null`. The `COMM_NAT_DEV_HOSTNAME` environment
// variable can be used to override the autodetected hostname.
function getDevHostname() {
  const { COMM_DEV: isDev, COMM_NAT_DEV_HOSTNAME } = process.env;

  if (!isDev) {
    return null;
  }
  if (COMM_NAT_DEV_HOSTNAME) {
    return COMM_NAT_DEV_HOSTNAME;
  }
  return ip.v4.sync();
}

export default {
  extra: {
    // developer machine's hostname in the local network
    natDevHostname: getDevHostname(),
  },
};
