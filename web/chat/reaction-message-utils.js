// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  sendReactionMessage,
  sendReactionMessageActionTypes,
} from 'lib/actions/message-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { messageTypes } from 'lib/types/message-types.js';
import type { RawReactionMessageInfo } from 'lib/types/messages/reaction.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';
import { cloneError } from 'lib/utils/errors.js';

import Alert from '../modals/alert.react.js';
import { useSelector } from '../redux/redux-utils.js';

function useSendReaction(
  messageID: ?string,
  localID: string,
  threadID: string,
): (reaction: string, action: 'add_reaction' | 'remove_reaction') => mixed {
  const { pushModal } = useModalContext();

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const callSendReactionMessage = useServerCall(sendReactionMessage);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    (reaction, action) => {
      if (!messageID) {
        return;
      }

      invariant(viewerID, 'viewerID should be set');

      const reactionMessagePromise = (async () => {
        try {
          const result = await callSendReactionMessage({
            threadID,
            localID,
            targetMessageID: messageID,
            reaction,
            action,
          });
          return {
            localID,
            serverID: result.id,
            threadID,
            time: result.time,
            interface: result.interface,
          };
        } catch (e) {
          pushModal(
            <Alert title="Couldn’t send the reaction">
              Please try again later
            </Alert>,
          );

          const copy = cloneError(e);
          copy.localID = localID;
          copy.threadID = threadID;
          throw copy;
        }
      })();

      const startingPayload: RawReactionMessageInfo = {
        type: messageTypes.REACTION,
        threadID,
        localID,
        creatorID: viewerID,
        time: Date.now(),
        targetMessageID: messageID,
        reaction,
        action,
      };

      dispatchActionPromise(
        sendReactionMessageActionTypes,
        reactionMessagePromise,
        undefined,
        startingPayload,
      );
    },
    [
      messageID,
      viewerID,
      threadID,
      localID,
      dispatchActionPromise,
      callSendReactionMessage,
      pushModal,
    ],
  );
}

export { useSendReaction };
