// @flow

let authoritativeKeyserverIDfromJSON: string;
try {
  const {
    authoritativeKeyserverID: keyserverID,
    // $FlowExpectedError: file might not exist
  } = require('./facts/authoritativeKeyserverID.json');
  authoritativeKeyserverIDfromJSON = keyserverID;
} catch {}

export { authoritativeKeyserverIDfromJSON };
