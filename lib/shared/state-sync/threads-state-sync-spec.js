// @flow

import t from 'tcomb';

import type { StateSyncSpec } from './state-sync-spec.js';
import {
  type RawThreadInfos,
  type RawThreadInfo,
  rawThreadInfoValidator,
} from '../../types/thread-types.js';
import { convertClientIDsToServerIDs } from '../../utils/conversion-utils.js';
import { ashoatKeyserverID, tID } from '../../utils/validation-utils.js';

export const threadsStateSyncSpec: StateSyncSpec<
  RawThreadInfos,
  RawThreadInfo,
> = Object.freeze({
  hashKey: 'threadInfos',
  innerHashSpec: {
    hashKey: 'threadInfo',
    deleteKey: 'deleteThreadIDs',
    rawInfosKey: 'rawThreadInfos',
  },
  convertClientToServerInfos(infos: RawThreadInfos) {
    return convertClientIDsToServerIDs(
      ashoatKeyserverID,
      t.dict(tID, rawThreadInfoValidator),
      infos,
    );
  },
});
