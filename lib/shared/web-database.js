// @flow

import { isStaff } from './staff-utils.js';
import { isDev } from '../utils/dev-utils.js';

function canUseDatabaseOnWeb(userID: ?string): boolean {
  if (!userID) {
    return false;
  }
  return isDev || isStaff(userID);
}

export { canUseDatabaseOnWeb };
