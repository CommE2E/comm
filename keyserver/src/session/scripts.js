// @flow

import { Viewer } from './viewer.js';

// Note that since the returned Viewer doesn't have a valid cookieID or
// sessionID, a lot of things can go wrong when trying to use it with certain
// functions.
function createScriptViewer(userID: string): Viewer {
  return new Viewer({
    isSocket: true,
    loggedIn: true,
    id: userID,
    platformDetails: null,
    deviceToken: null,
    userID,
    cookieID: null,
    cookiePassword: null,
    sessionID: null,
    sessionInfo: null,
    isScriptViewer: true,
  });
}

export { createScriptViewer };
