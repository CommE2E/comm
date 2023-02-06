// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  sendReactionMessage,
  sendReactionMessageActionTypes,
} from 'lib/actions/message-actions';
import { useModalContext } from 'lib/components/modal-provider.react';
import { messageTypes } from 'lib/types/message-types';
import type { RawReactionMessageInfo } from 'lib/types/messages/reaction';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';
import { cloneError } from 'lib/utils/errors';

import Alert from '../modals/alert.react';
import { useSelector } from '../redux/redux-utils';
import {
  appContainerPositionInfo,
  type TooltipSize,
  type TooltipPositionStyle,
} from '../utils/tooltip-utils';

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

type EmojiKeyboardPosition = {
  +bottom: number,
  +left: number,
};

function getEmojiKeyboardPosition(
  tooltipPositionStyle: TooltipPositionStyle,
  tooltipSize: TooltipSize,
): EmojiKeyboardPosition {
  const { alignment, anchorPoint } = tooltipPositionStyle;
  const tooltipAnchorX = anchorPoint.x;
  const tooltipAnchorY = anchorPoint.y;

  const tooltipWidth = tooltipSize.width;
  const tooltipHeight = tooltipSize.height;

  const {
    top: containerTop,
    left: containerLeft,
    right: containerRight,
    bottom: containerBottom,
  } = appContainerPositionInfo;

  const emojiKeyboardWidth = 352;
  const emojiKeyboardHeight = 435;

  const padding = 16;

  const canBeDisplayedOnRight =
    tooltipAnchorX + tooltipWidth + emojiKeyboardWidth <= containerRight;

  const canBeDisplayedOnLeft =
    tooltipAnchorX - emojiKeyboardWidth >= containerLeft;

  const canBeDisplayedOnTop =
    tooltipAnchorY - emojiKeyboardHeight - padding >= containerTop;

  const canBeDisplayedOnBottom =
    tooltipAnchorY + tooltipHeight + emojiKeyboardHeight + padding <=
    containerBottom;

  const emojiKeyboardOverflowTop =
    containerTop - (tooltipAnchorY + tooltipHeight - emojiKeyboardHeight);

  const emojiKeyboardOverflowTopCorrection =
    emojiKeyboardOverflowTop > 0 ? -emojiKeyboardOverflowTop - padding : 0;

  const emojiKeyboardOverflowRight =
    tooltipAnchorX + emojiKeyboardWidth - containerRight;

  const emojiKeyboardOverflowRightCorrection =
    emojiKeyboardOverflowRight > 0 ? -emojiKeyboardOverflowRight - padding : 0;

  if (alignment === 'left' && canBeDisplayedOnRight) {
    return {
      left: tooltipWidth,
      bottom: emojiKeyboardOverflowTopCorrection,
    };
  }

  if (alignment === 'right' && canBeDisplayedOnLeft) {
    return {
      left: -emojiKeyboardWidth,
      bottom: emojiKeyboardOverflowTopCorrection,
    };
  }

  if (canBeDisplayedOnTop) {
    return {
      bottom: tooltipHeight + padding,
      left: emojiKeyboardOverflowRightCorrection,
    };
  }

  if (canBeDisplayedOnBottom) {
    return {
      bottom: -emojiKeyboardHeight - padding,
      left: emojiKeyboardOverflowRightCorrection,
    };
  }

  return {
    left: alignment === 'left' ? -emojiKeyboardWidth : tooltipWidth,
    bottom: emojiKeyboardOverflowTopCorrection,
  };
}

export { useSendReaction, getEmojiKeyboardPosition };
