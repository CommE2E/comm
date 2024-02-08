// @flow

let authoritativeKeyserverID: string;
try {
  const {
    authoritativeKeyserverID: keyserverID,
    // $FlowExpectedError: file might not exist
  } = require('./facts/authoritative_keyserver.json');
  authoritativeKeyserverID = keyserverID;
} catch {}

export { authoritativeKeyserverID };
