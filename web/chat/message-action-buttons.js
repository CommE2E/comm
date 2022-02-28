// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';

import type { InputState } from '../input/input-state.js';
import {
  useOnClickThread,
  useOnClickPendingSidebar,
} from '../selectors/nav-selectors';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './message-action-buttons.css';
import MessageReplyButton from './message-reply-button.react';
import type {
  ItemAndContainerPositionInfo,
  MessagePositionInfo,
  OnMessagePositionWithContainerInfo,
  PositionInfo,
} from './position-types';
import { tooltipPositions, type TooltipPosition } from './tooltip-utils';
import {
  TooltipMenu,
  type TooltipStyle,
  TooltipTextItem,
} from './tooltip.react';

const messageActionIconExcessVerticalWhitespace = 10;

const openSidebarText = 'Go to sidebar';
const createSidebarText = 'Create sidebar';

type MessageActionButtonsProps = {
  +threadInfo: ThreadInfo,
  +item: ChatMessageInfoItem,
  +containerPosition: PositionInfo,
  +availableTooltipPositions: $ReadOnlyArray<TooltipPosition>,
  +setMouseOverMessagePosition?: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  +mouseOverMessagePosition?: OnMessagePositionWithContainerInfo,
  +canReply?: boolean,
  +inputState?: ?InputState,
  +sidebarExistsOrCanBeCreated?: boolean,
};
function MessageActionButtons(props: MessageActionButtonsProps): React.Node {
  const {
    threadInfo,
    item,
    containerPosition,
    availableTooltipPositions,
    setMouseOverMessagePosition,
    mouseOverMessagePosition,
    canReply,
    inputState,
    sidebarExistsOrCanBeCreated,
  } = props;

  const [tooltipVisible, setTooltipVisible] = React.useState(false);
  const [pointingTo, setPointingTo] = React.useState();

  const toggleTooltip = React.useCallback(
    (event: SyntheticEvent<HTMLDivElement>) => {
      setTooltipVisible(!tooltipVisible);
      if (tooltipVisible) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const { top, bottom, left, right, width, height } = rect;

      const iconPosition: ItemAndContainerPositionInfo = {
        containerPosition,
        itemPosition: {
          top:
            top -
            containerPosition.top +
            messageActionIconExcessVerticalWhitespace,
          bottom:
            bottom -
            containerPosition.top -
            messageActionIconExcessVerticalWhitespace,
          left: left - containerPosition.left,
          right: right - containerPosition.left,
          width,
          height: height - messageActionIconExcessVerticalWhitespace * 2,
        },
      };
      setPointingTo(iconPosition);
    },
    [containerPosition, tooltipVisible],
  );

  const hideTooltip = React.useCallback(() => {
    setTooltipVisible(false);
  }, []);

  const { threadCreatedFromMessage, messageInfo } = item;

  const onThreadOpen = useOnClickThread(threadCreatedFromMessage);
  const onPendingSidebarOpen = useOnClickPendingSidebar(
    messageInfo,
    threadInfo,
  );
  const onSidebarButtonClick = React.useCallback(
    (event: SyntheticEvent<HTMLButtonElement>) => {
      if (threadCreatedFromMessage) {
        onThreadOpen(event);
      } else {
        onPendingSidebarOpen(event);
      }
    },
    [onPendingSidebarOpen, onThreadOpen, threadCreatedFromMessage],
  );

  const onReplyButtonClick = React.useCallback(() => {
    invariant(
      setMouseOverMessagePosition,
      'setMouseOverMessagePosition should be set if replyButton exists',
    );
    setMouseOverMessagePosition({ type: 'off', item: item });
  }, [item, setMouseOverMessagePosition]);

  const sidebarTooltipButtonText = threadCreatedFromMessage
    ? openSidebarText
    : createSidebarText;

  let tooltipMenu = null;
  if (pointingTo && tooltipVisible) {
    tooltipMenu = (
      <TooltipMenu
        availableTooltipPositions={availableTooltipPositions}
        targetPositionInfo={pointingTo}
        layoutPosition="relative"
        getStyle={getMessageActionTooltipStyle}
      >
        <TooltipTextItem text={sidebarTooltipButtonText} />
      </TooltipMenu>
    );
  }

  let replyButton;
  if (canReply) {
    invariant(inputState, 'inputState must be set if replyButton exists');
    invariant(
      mouseOverMessagePosition,
      'mouseOverMessagePosition must be set if replyButton exists',
    );
    replyButton = (
      <MessageReplyButton
        messagePositionInfo={mouseOverMessagePosition}
        onReplyClick={onReplyButtonClick}
        inputState={inputState}
      />
    );
  }

  let sidebarButton;
  if (sidebarExistsOrCanBeCreated) {
    sidebarButton = (
      <div
        className={css.messageActionLinkIcon}
        onMouseLeave={hideTooltip}
        onClick={onSidebarButtonClick}
        onMouseEnter={toggleTooltip}
      >
        <SWMansionIcon icon="message-circle-lines" size={18} />
        {tooltipMenu}
      </div>
    );
  }

  return (
    <div className={css.messageActionButton}>
      {sidebarButton}
      {replyButton}
    </div>
  );
}

function getMessageActionTooltipStyle(
  tooltipPosition: TooltipPosition,
): TooltipStyle {
  let className;
  if (tooltipPosition === tooltipPositions.TOP_RIGHT) {
    className = classNames(
      css.messageActionTopRightTooltip,
      css.messageActionExtraAreaTop,
      css.messageActionExtraAreaTopRight,
    );
  } else if (tooltipPosition === tooltipPositions.TOP_LEFT) {
    className = classNames(
      css.messageActionTopLeftTooltip,
      css.messageActionExtraAreaTop,
      css.messageActionExtraAreaTopLeft,
    );
  } else if (tooltipPosition === tooltipPositions.RIGHT) {
    className = classNames(
      css.messageActionRightTooltip,
      css.messageActionExtraArea,
      css.messageActionExtraAreaRight,
    );
  } else if (tooltipPosition === tooltipPositions.LEFT) {
    className = classNames(
      css.messageActionLeftTooltip,
      css.messageActionExtraArea,
      css.messageActionExtraAreaLeft,
    );
  }

  invariant(className, `${tooltipPosition} is not valid for message tooltip`);
  return { className };
}

export default MessageActionButtons;
