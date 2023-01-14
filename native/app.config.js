/* eslint-disable flowtype/require-valid-file-annotation */

import ip from 'internal-ip';

export default {
  extra: {
    // developer machine's hostname in the local network
    natDevHostname: ip.v4.sync(),
  },
};
