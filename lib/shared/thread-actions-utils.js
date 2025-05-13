// @flow

import { removeUsersFromThreadActionTypes } from '../actions/thread-action-types.js';
import type { RemoveUsersFromThreadInput } from '../hooks/thread-hooks.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import type { ChangeThreadSettingsPayload } from '../types/thread-types.js';
import type { DispatchActionPromise } from '../utils/redux-promise-utils.js';

function removeMemberFromThread(
  threadInfo: ThreadInfo,
  memberInfo: RelativeMemberInfo,
  dispatchActionPromise: DispatchActionPromise,
  removeUserFromThreadServerCall: (
    input: RemoveUsersFromThreadInput,
  ) => Promise<ChangeThreadSettingsPayload>,
) {
  const customKeyName = `${removeUsersFromThreadActionTypes.started}:${memberInfo.id}`;
  void dispatchActionPromise(
    removeUsersFromThreadActionTypes,
    removeUserFromThreadServerCall({
      threadID: threadInfo.id,
      memberIDs: [memberInfo.id],
    }),
    { customKeyName },
  );
}

export { removeMemberFromThread };
