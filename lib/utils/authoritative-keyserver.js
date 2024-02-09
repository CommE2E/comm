// @flow

import invariant from 'invariant';

import { getConfig, hasConfig } from './config.js';
import { ashoatKeyserverID } from './validation-utils.js';

const authoritativeKeyserverID: () => string = () => {
  invariant(
    !process.env['KEYSERVER'],
    'keyserver should not use authoritativeKeyserverID',
  );
  if (!hasConfig()) {
    // When running jest, config is not registered
    return ashoatKeyserverID;
  }
  return getConfig().authoritativeKeyserverID;
};

export { authoritativeKeyserverID };
