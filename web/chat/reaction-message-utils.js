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
import {
  type TooltipSize,
  type TooltipPositionStyle,
} from '../utils/tooltip-utils.js';
import { getAppContainerPositionInfo } from '../utils/window-utils.js';

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
  emojiKeyboard: ?HTMLDivElement,
  tooltipPositionStyle: TooltipPositionStyle,
  tooltipSize: TooltipSize,
): ?EmojiKeyboardPosition {
  const { alignment, anchorPoint } = tooltipPositionStyle;
  const tooltipAnchorX = anchorPoint.x;
  const tooltipAnchorY = anchorPoint.y;

  const tooltipWidth = tooltipSize.width;
  const tooltipHeight = tooltipSize.height;

  const appContainerPositionInfo = getAppContainerPositionInfo();

  if (!appContainerPositionInfo) {
    return null;
  }

  let emojiKeyboardWidth = 352;
  let emojiKeyboardHeight = 435;

  if (emojiKeyboard) {
    const { width, height } = emojiKeyboard.getBoundingClientRect();
    console.log(emojiKeyboard.getBoundingClientRect());
    emojiKeyboardWidth = width;
    emojiKeyboardHeight = height;
  }

  const {
    top: containerTop,
    left: containerLeft,
    right: containerRight,
    bottom: containerBottom,
  } = appContainerPositionInfo;

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
