// @flow

import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { mixedThinRawThreadInfoValidator } from '../../permissions/minimally-encoded-raw-thread-info-validators.js';
import { tShape, tID } from '../../utils/validation-utils.js';
import { mediaValidator } from '../media-types.js';
import {
  rawMessageInfoValidator,
  messageTruncationStatusesValidator,
} from '../message-types.js';
import {
  type ChangeThreadSettingsResult,
  type LeaveThreadResult,
  type NewThreadResponse,
  type ThreadJoinResult,
  type ThreadFetchMediaResult,
  type ToggleMessagePinResult,
  type RoleModificationResult,
  type RoleDeletionResult,
} from '../thread-types.js';
import { serverUpdateInfoValidator } from '../update-types.js';
import { userInfosValidator } from '../user-types.js';

export const leaveThreadResultValidator: TInterface<LeaveThreadResult> =
  tShape<LeaveThreadResult>({
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
  });

export const changeThreadSettingsResultValidator: TInterface<ChangeThreadSettingsResult> =
  tShape<ChangeThreadSettingsResult>({
    newMessageInfos: t.list(rawMessageInfoValidator),
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
  });

export const newThreadResponseValidator: TInterface<NewThreadResponse> =
  tShape<NewThreadResponse>({
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
    newMessageInfos: t.list(rawMessageInfoValidator),
    userInfos: userInfosValidator,
    newThreadID: tID,
  });

export const threadJoinResultValidator: TInterface<ThreadJoinResult> =
  tShape<ThreadJoinResult>({
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
    rawMessageInfos: t.list(rawMessageInfoValidator),
    truncationStatuses: messageTruncationStatusesValidator,
    userInfos: userInfosValidator,
  });

export const threadFetchMediaResultValidator: TInterface<ThreadFetchMediaResult> =
  tShape<ThreadFetchMediaResult>({ media: t.list(mediaValidator) });

export const toggleMessagePinResultValidator: TInterface<ToggleMessagePinResult> =
  tShape<ToggleMessagePinResult>({
    newMessageInfos: t.list(rawMessageInfoValidator),
    threadID: tID,
  });

export const roleModificationResultValidator: TInterface<RoleModificationResult> =
  tShape<RoleModificationResult>({
    threadInfo: t.maybe(mixedThinRawThreadInfoValidator),
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
  });

export const roleDeletionResultValidator: TInterface<RoleDeletionResult> =
  tShape<RoleDeletionResult>({
    threadInfo: t.maybe(mixedThinRawThreadInfoValidator),
    updatesResult: tShape({
      newUpdates: t.list(serverUpdateInfoValidator),
    }),
  });
