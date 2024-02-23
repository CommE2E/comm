// @flow

import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

let authoritativeKeyserverID: string = ashoatKeyserverID;
try {
  const {
    authoritativeKeyserverID: keyserverID,
    // $FlowExpectedError: file might not exist
  } = require('./facts/authoritative_keyserver.json');
  authoritativeKeyserverID = keyserverID;
} catch {}

export { authoritativeKeyserverID };
