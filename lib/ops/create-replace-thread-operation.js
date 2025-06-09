// @flow

import type { ReplaceThreadOperation } from './thread-store-ops.js';
import { threadSpecs } from '../shared/threads/thread-specs.js';
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
      isBackedUp: threadSpecs[threadInfo.type].protocol.dataIsBackedUp,
    },
  };
}

export { createReplaceThreadOperation };
