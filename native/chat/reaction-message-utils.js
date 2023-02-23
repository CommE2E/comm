// @flow

import invariant from 'invariant';
import * as React from 'react';
import Alert from 'react-native/Libraries/Alert/Alert.js';

import {
  sendReactionMessage,
  sendReactionMessageActionTypes,
} from 'lib/actions/message-actions.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { messageTypes } from 'lib/types/message-types.js';
import type { RawReactionMessageInfo } from 'lib/types/messages/reaction.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';
import { cloneError } from 'lib/utils/errors.js';

import { useSelector } from '../redux/redux-utils.js';
import type {
  LayoutCoordinates,
  VerticalBounds,
} from '../types/layout-types.js';
import type { ViewStyle } from '../types/styles.js';

function useSendReaction(
  messageID: ?string,
  localID: string,
  threadID: string,
  reactions: ReactionInfo,
): (reaction: string) => mixed {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const callSendReactionMessage = useServerCall(sendReactionMessage);
  const dispatchActionPromise = useDispatchActionPromise();

  return React.useCallback(
    reaction => {
      if (!messageID) {
        return;
      }

      invariant(viewerID, 'viewerID should be set');

      let viewerReacted = false;
      if (Object.keys(reactions).length > 0) {
        viewerReacted = reactions[reaction].viewerReacted;
      }
      const action = viewerReacted ? 'remove_reaction' : 'add_reaction';

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
          Alert.alert(
            'Couldn’t send the reaction',
            'Please try again later',
            [{ text: 'OK' }],
            {
              cancelable: true,
            },
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
      reactions,
      threadID,
      localID,
      dispatchActionPromise,
      callSendReactionMessage,
    ],
  );
}

type ReactionSelectionPopoverPositionArgs = {
  +initialCoordinates: LayoutCoordinates,
  +verticalBounds: VerticalBounds,
  +margin: ?number,
};

function useReactionSelectionPopoverPosition({
  initialCoordinates,
  verticalBounds,
  margin,
}: ReactionSelectionPopoverPositionArgs): ViewStyle {
  const reactionSelectionPopoverHeight = 56;

  const calculatedMargin = margin ?? 16;

  const windowWidth = useSelector(state => state.dimensions.width);

  const reactionSelectionPopoverLocation: 'above' | 'below' = (() => {
    const { y, height } = initialCoordinates;
    const contentTop = y;
    const contentBottom = y + height;
    const boundsTop = verticalBounds.y;
    const boundsBottom = verticalBounds.y + verticalBounds.height;

    const fullHeight = reactionSelectionPopoverHeight + calculatedMargin;

    if (
      contentBottom + fullHeight > boundsBottom &&
      contentTop - fullHeight > boundsTop
    ) {
      return 'above';
    }

    return 'below';
  })();

  return React.useMemo(() => {
    const { x, width, height } = initialCoordinates;

    const style = {};

    style.position = 'absolute';

    const extraLeftSpace = x;
    const extraRightSpace = windowWidth - width - x;
    if (extraLeftSpace < extraRightSpace) {
      style.left = 0;
    } else {
      style.right = 0;
    }

    if (reactionSelectionPopoverLocation === 'above') {
      style.bottom = height + calculatedMargin / 2;
    } else {
      style.top = height + calculatedMargin / 2;
    }

    return style;
  }, [
    calculatedMargin,
    initialCoordinates,
    reactionSelectionPopoverLocation,
    windowWidth,
  ]);
}

export { useSendReaction, useReactionSelectionPopoverPosition };
