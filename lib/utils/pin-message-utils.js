// @flow

import * as React from 'react';

import { useDispatchActionPromise } from './redux-promise-utils.js';
import { useToggleMessagePin } from '../hooks/message-hooks.js';
import { usePinMessage } from '../shared/farcaster/farcaster-api.js';
import { threadSpecs } from '../shared/threads/thread-specs.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';

function usePinMessageAction(): (
  messageID: string,
  threadInfo: ThreadInfo,
  action: 'pin' | 'unpin',
) => Promise<void> {
  const keyserverToggleMessagePin = useToggleMessagePin();
  const farcasterPinMessage = usePinMessage();
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    async (
      messageID: string,
      threadInfo: ThreadInfo,
      action: 'pin' | 'unpin',
    ) => {
      await threadSpecs[threadInfo.type].protocol().pinMessage(
        { messageID, threadInfo, action },
        {
          keyserverToggleMessagePin,
          farcasterPinMessage,
          dispatchActionPromise,
        },
      );
    },
    [keyserverToggleMessagePin, farcasterPinMessage, dispatchActionPromise],
  );
}

export { usePinMessageAction };
