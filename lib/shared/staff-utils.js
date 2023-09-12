// @flow

import bots from '../facts/bots.js';
import staff from '../facts/staff.js';
import { useSelector } from '../utils/redux-utils.js';

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

function useIsCurrentUserStaff(): boolean {
  const isCurrentUserStaff = useSelector(state =>
    state.currentUserInfo?.id ? isStaff(state.currentUserInfo.id) : false,
  );
  return isCurrentUserStaff;
}

export { isStaff, useIsCurrentUserStaff };
