// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { useSendReactionBase } from 'lib/shared/reaction-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import Alert from '../modals/alert.react.js';
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

  const showErrorAlert = React.useCallback(
    () =>
      pushModal(
        <Alert title="Couldn’t send the reaction">
          Please try again later
        </Alert>,
      ),
    [pushModal],
  );
  return useSendReactionBase(messageID, threadInfo, reactions, showErrorAlert);
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
