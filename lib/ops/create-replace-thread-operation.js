// @flow

import type { ReplaceThreadOperation } from './thread-store-ops.js';
import { getDataIsBackedUpByThread } from '../shared/threads/protocols/thread-protocols.js';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';

function createReplaceThreadOperation(
  id: string,
  threadInfo: RawThreadInfo,
): ReplaceThreadOperation {
  return {
    type: 'replace',
    payload: {
      id,
      threadInfo,
      isBackedUp: getDataIsBackedUpByThread(id, threadInfo),
    },
  };
}

export { createReplaceThreadOperation };
