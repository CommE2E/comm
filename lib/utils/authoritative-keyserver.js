// @flow

import { getConfig, hasConfig } from './config.js';
import { ashoatKeyserverID } from './validation-utils.js';

const authoritativeKeyserverID: () => string = () => {
  if (!hasConfig()) {
    // When running jest or the keyserver, config is not registered
    // Keyserver shouldn't use authoritativeKeyserverID,
    // but keyserver depends on web, which uses authoritativeKeyserverID
    return ashoatKeyserverID;
  }
  return getConfig().authoritativeKeyserverID;
};

export { authoritativeKeyserverID };
