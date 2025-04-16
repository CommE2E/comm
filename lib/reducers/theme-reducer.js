// @flow

import { updateThemeInfoActionType } from '../actions/theme-actions.js';
import { legacyLogInActionTypes } from '../actions/user-actions.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { BaseAction } from '../types/redux-types.js';
import {
  defaultGlobalThemeInfo,
  type GlobalThemeInfo,
} from '../types/theme-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';
import { relyingOnAuthoritativeKeyserver } from '../utils/services-utils.js';

export default function reduceGlobalThemeInfo(
  state: GlobalThemeInfo,
  action: BaseAction,
): GlobalThemeInfo {
  if (action.type === legacyLogInActionTypes.success) {
    return defaultGlobalThemeInfo;
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated &&
    action.payload.keyserverID === authoritativeKeyserverID() &&
    relyingOnAuthoritativeKeyserver
  ) {
    return defaultGlobalThemeInfo;
  } else if (action.type === updateThemeInfoActionType) {
    return {
      ...state,
      ...action.payload,
    };
  }
  return state;
}
