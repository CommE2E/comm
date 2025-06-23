// @flow

import { dmThreadProtocol } from './dm-thread-protocol.js';
import { keyserverThreadProtocol } from './keyserver-thread-protocol.js';
import type { RawThreadInfo } from '../../../types/minimally-encoded-thread-permissions-types.js';
import { type LegacyRawThreadInfo } from '../../../types/thread-types.js';
import { type ThreadProtocol } from '../thread-spec.js';
import { threadSpecs } from '../thread-specs.js';

const protocols = (): $ReadOnlyArray<ThreadProtocol<any>> => [
  dmThreadProtocol,
  keyserverThreadProtocol,
];

function getProtocolByThreadID(threadID: string): ?ThreadProtocol<any> {
  return protocols().find(p => p.threadIDMatchesProtocol(threadID));
}

function getDataIsBackedUpByThread(
  threadID: string,
  threadInfo: ?(LegacyRawThreadInfo | RawThreadInfo),
): boolean {
  if (threadInfo) {
    return threadSpecs[threadInfo.type].protocol.dataIsBackedUp;
  }
  return !!getProtocolByThreadID(threadID)?.dataIsBackedUp;
}

export { protocols, getProtocolByThreadID, getDataIsBackedUpByThread };
