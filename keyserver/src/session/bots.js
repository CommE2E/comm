// @flow

import bots from 'lib/facts/bots.js';
import { ServerError } from 'lib/utils/errors.js';

import { Viewer } from './viewer.js';

// Note that since the returned Viewer doesn't have a valid cookieID or
// sessionID, a lot of things can go wrong when trying to use it with certain
// functions.
function createBotViewer(userID: string): Viewer {
  let userIDIsBot = false;
  for (const botName in bots) {
    if (bots[botName].userID === userID) {
      userIDIsBot = true;
      break;
    }
  }
  if (!userIDIsBot) {
    throw new ServerError('invalid_bot_id');
  }
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

export { createBotViewer };
