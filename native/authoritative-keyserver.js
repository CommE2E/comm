// @flow

import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

function getAuthoritativeKeyserverID(): string {
  try {
    const {
      authoritativeKeyserverID: keyserverID,
      // $FlowExpectedError: file might not exist
    } = require('./facts/authoritative_keyserver.json');
    return keyserverID;
  } catch {
    return ashoatKeyserverID;
  }
}

const authoritativeKeyserverID: string = getAuthoritativeKeyserverID();

export { authoritativeKeyserverID };
