// @flow

import type { StateSyncSpec } from './state-sync-spec.js';
import type {
  CurrentUserInfo,
  OldCurrentUserInfo,
} from '../../types/user-types.js';
import { currentUserInfoValidator } from '../../types/user-types.js';
import { convertClientIDsToServerIDs } from '../../utils/conversion-utils.js';
import { ashoatKeyserverID } from '../../utils/validation-utils.js';

export const currentUserStateSyncSpec: StateSyncSpec<
  OldCurrentUserInfo | CurrentUserInfo,
> = Object.freeze({
  hashKey: 'currentUserInfo',
  convertClientToServerInfos(info: OldCurrentUserInfo | CurrentUserInfo) {
    return convertClientIDsToServerIDs(
      ashoatKeyserverID,
      currentUserInfoValidator,
      info,
    );
  },
});
