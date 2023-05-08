// @flow

import bots from '../facts/bots.js';
import staff from '../facts/staff.js';

function isStaff(userID: string): boolean {
  if (staff.includes(userID)) {
    return true;
  }
  for (const key in bots) {
    const bot = bots[key];
    if (userID === bot.userID) {
      return true;
    }
  }
  return false;
}

export { isStaff };
