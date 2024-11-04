// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  useSendReactionMessage,
  sendReactionMessageActionTypes,
} from 'lib/actions/message-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors';
import {
  dmOperationSpecificationTypes,
  type OutboundDMOperationSpecification,
} from 'lib/shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from 'lib/shared/dm-ops/process-dm-ops.js';
import { getNextLocalID } from 'lib/shared/message-utils.js';
import { type DMSendReactionMessageOperation } from 'lib/types/dm-ops.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { RawReactionMessageInfo } from 'lib/types/messages/reaction.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import {
  thickThreadTypes,
  threadTypeIsThick,
} from 'lib/types/thread-types-enum.js';
import { SendMessageError, getMessageForException } from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import Alert from '../modals/alert.react.js';
import { useSelector } from '../redux/redux-utils.js';
import {
  type TooltipSize,
  type TooltipPositionStyle,
} from '../tooltips/tooltip-utils.js';
import { getAppContainerPositionInfo } from '../utils/window-utils.js';

function useSendReaction(
  messageID: ?string,
  threadInfo: ThreadInfo,
  reactions: ReactionInfo,
): (reaction: string) => mixed {
  const { pushModal } = useModalContext();

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const callSendReactionMessage = useSendReactionMessage();
  const dispatchActionPromise = useDispatchActionPromise();
  const processAndSendDMOperation = useProcessAndSendDMOperation();

  return React.useCallback(
    reaction => {
      if (!messageID) {
        return;
      }

      const localID = getNextLocalID();

      invariant(viewerID, 'viewerID should be set');

      const viewerReacted = reactions[reaction]
        ? reactions[reaction].viewerReacted
        : false;
      const action = viewerReacted ? 'remove_reaction' : 'add_reaction';

      const threadID = threadInfo.id;

      if (threadTypeIsThick(threadInfo.type)) {
        const op: DMSendReactionMessageOperation = {
          type: 'send_reaction_message',
          threadID,
          creatorID: viewerID,
          time: Date.now(),
          messageID: uuid.v4(),
          targetMessageID: messageID,
          reaction,
          action,
        };
        const opSpecification: OutboundDMOperationSpecification = {
          type: dmOperationSpecificationTypes.OUTBOUND,
          op,
          recipients: {
            type: 'all_thread_members',
            threadID:
              threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
              threadInfo.parentThreadID
                ? threadInfo.parentThreadID
                : threadInfo.id,
          },
        };
        void processAndSendDMOperation(opSpecification);
        return;
      }

      const reactionMessagePromise = (async () => {
        try {
          const result = await callSendReactionMessage({
            threadID,
            localID,
            targetMessageID: messageID,
            reaction,
            action,
          });
          const serverID: string = result.id;
          const time: number = result.time;
          return {
            localID,
            serverID,
            threadID,
            time,
          };
        } catch (e) {
          pushModal(
            <Alert title="Couldn’t send the reaction">
              Please try again later
            </Alert>,
          );

          throw new SendMessageError(
            getMessageForException(e) ?? '',
            localID,
            threadID,
          );
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

      void dispatchActionPromise(
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
      threadInfo.id,
      threadInfo.type,
      threadInfo.parentThreadID,
      dispatchActionPromise,
      processAndSendDMOperation,
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
