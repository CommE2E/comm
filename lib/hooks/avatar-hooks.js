// @flow

import { threadInfoSelector } from '../selectors/thread-selectors.js';
import { getAvatarForThread } from '../shared/avatar-utils.js';
import type { ClientAvatar } from '../types/avatar-types.js';
import type {
  ThreadInfo,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useAvatarForThread(thread: RawThreadInfo | ThreadInfo): ClientAvatar {
  const { containingThreadID } = thread;
  const containingThreadInfo = useSelector(state =>
    containingThreadID ? threadInfoSelector(state)[containingThreadID] : null,
  );
  return getAvatarForThread(thread, containingThreadInfo);
}

export { useAvatarForThread };
