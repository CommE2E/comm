// @flow

import type { StateSyncSpec } from './state-sync-spec.js';
import {
  type CurrentUserInfo,
  currentUserInfoValidator,
} from '../../types/user-types.js';
import { convertClientIDsToServerIDs } from '../../utils/conversion-utils.js';
import { ashoatKeyserverID } from '../../utils/validation-utils.js';

export const currentUserStateSyncSpec: StateSyncSpec<CurrentUserInfo> =
  Object.freeze({
    hashKey: 'currentUserInfo',
    convertClientToServerInfos(info: CurrentUserInfo) {
      return convertClientIDsToServerIDs(
        ashoatKeyserverID,
        currentUserInfoValidator,
        info,
      );
    },
  });
