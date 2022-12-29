// @flow

import * as React from 'react';

import {
  sendReactionMessage,
  sendReactionMessageActionTypes,
} from 'lib/actions/message-actions';
import { useModalContext } from 'lib/components/modal-provider.react';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Alert from '../modals/alert.react';

function useOnClickReact(
  messageID: ?string,
  threadID: string,
  reaction: string,
  action: 'add_reaction' | 'remove_reaction',
): (event: SyntheticEvent<HTMLElement>) => void {
  const { pushModal } = useModalContext();

  const callSendReactionMessage = useServerCall(sendReactionMessage);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();

      if (!messageID) {
        return;
      }

      const reactionMessagePromise = (async () => {
        try {
          const result = await callSendReactionMessage({
            threadID,
            targetMessageID: messageID,
            reaction,
            action,
          });
          return {
            serverID: result.id,
            threadID,
            time: result.newMessageInfo.time,
            newMessageInfos: [result.newMessageInfo],
          };
        } catch (e) {
          pushModal(
            <Alert title="Couldn’t send the reaction">
              Please try again later
            </Alert>,
          );
          throw e;
        }
      })();

      dispatchActionPromise(
        sendReactionMessageActionTypes,
        reactionMessagePromise,
      );
    },
    [
      action,
      callSendReactionMessage,
      dispatchActionPromise,
      messageID,
      pushModal,
      reaction,
      threadID,
    ],
  );
}

export { useOnClickReact };
