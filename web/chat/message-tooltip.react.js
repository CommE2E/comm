// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { useSidebarExistsOrCanBeCreated } from 'lib/shared/thread-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import CommIcon from '../CommIcon.react.js';
import type { InputState } from '../input/input-state';
import {
  useOnClickThread,
  useOnClickPendingSidebar,
} from '../selectors/nav-selectors';
import MessageReplyButton from './message-reply-button.react';
import css from './message-tooltip.css';
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

const openSidebarText = 'Go to thread';
const createSidebarText = 'Create thread';

type TooltipType = 'sidebar' | 'reply';

type BaseMessageTooltipProps = {
  +threadInfo: ThreadInfo,
  +item: ChatMessageInfoItem,
  +availableTooltipPositions: $ReadOnlyArray<TooltipPosition>,
  +mouseOverMessagePosition: OnMessagePositionWithContainerInfo,
};
type MessageTooltipProps =
  | {
      ...BaseMessageTooltipProps,
      +canReply: false,
    }
  | {
      ...BaseMessageTooltipProps,
      +canReply: true,
      +inputState: ?InputState,
      +setMouseOverMessagePosition: (
        messagePositionInfo: MessagePositionInfo,
      ) => void,
    };
function MessageTooltip(props: MessageTooltipProps): React.Node {
  const {
    threadInfo,
    item,
    availableTooltipPositions,
    mouseOverMessagePosition,
    canReply,
  } = props;

  const { containerPosition } = mouseOverMessagePosition;

  const [activeTooltip, setActiveTooltip] = React.useState<?TooltipType>();
  const [pointingTo, setPointingTo] = React.useState();

  const showTooltip = React.useCallback(
    (tooltipType: TooltipType, iconPosition: ItemAndContainerPositionInfo) => {
      if (activeTooltip) {
        return;
      }
      setActiveTooltip(tooltipType);
      setPointingTo(iconPosition);
    },
    [activeTooltip],
  );

  const hideTooltip = React.useCallback(() => {
    setActiveTooltip(null);
  }, []);

  const showSidebarTooltip = React.useCallback(
    (event: SyntheticEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const iconPosition = getIconPosition(rect, containerPosition);
      showTooltip('sidebar', iconPosition);
    },
    [containerPosition, showTooltip],
  );

  const showReplyTooltip = React.useCallback(
    (event: SyntheticEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const iconPosition = getIconPosition(rect, containerPosition);
      showTooltip('reply', iconPosition);
    },
    [containerPosition, showTooltip],
  );

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

  const setMouseOverMessagePosition = props.canReply
    ? props.setMouseOverMessagePosition
    : null;

  const onReplyButtonClick = React.useCallback(() => {
    setMouseOverMessagePosition?.({
      type: 'off',
      item: item,
    });
  }, [item, setMouseOverMessagePosition]);

  let tooltipText = '';
  if (activeTooltip === 'reply') {
    tooltipText = 'Reply';
  } else if (activeTooltip === 'sidebar') {
    tooltipText = threadCreatedFromMessage
      ? openSidebarText
      : createSidebarText;
  }

  let tooltipMenu = null;
  if (pointingTo && activeTooltip) {
    tooltipMenu = (
      <TooltipMenu
        availableTooltipPositions={availableTooltipPositions}
        targetPositionInfo={pointingTo}
        layoutPosition="relative"
        getStyle={getMessageActionTooltipStyle}
      >
        <TooltipTextItem text={tooltipText} />
      </TooltipMenu>
    );
  }

  let replyButton;
  if (canReply) {
    invariant(props.inputState, 'inputState must be set if replyButton exists');
    replyButton = (
      <div
        className={css.messageActionLinkIcon}
        onMouseEnter={showReplyTooltip}
        onMouseLeave={hideTooltip}
      >
        <MessageReplyButton
          messagePositionInfo={mouseOverMessagePosition}
          onReplyClick={onReplyButtonClick}
          inputState={props.inputState}
        />
        {activeTooltip === 'reply' ? tooltipMenu : null}
      </div>
    );
  }

  const sidebarExistsOrCanBeCreated = useSidebarExistsOrCanBeCreated(
    threadInfo,
    item,
  );

  let sidebarButton;
  if (sidebarExistsOrCanBeCreated) {
    sidebarButton = (
      <div
        className={css.messageActionLinkIcon}
        onMouseEnter={showSidebarTooltip}
        onMouseLeave={hideTooltip}
        onClick={onSidebarButtonClick}
      >
        <CommIcon icon="sidebar-filled" size={16} />
        {activeTooltip === 'sidebar' ? tooltipMenu : null}
      </div>
    );
  }

  const { isViewer } = messageInfo.creator;
  const messageActionButtonsContainerClassName = classNames({
    [css.messageActionContainer]: true,
    [css.messageActionButtons]: true,
    [css.messageActionButtonsViewer]: isViewer,
    [css.messageActionButtonsNonViewer]: !isViewer,
  });
  return (
    <div>
      <div className={messageActionButtonsContainerClassName}>
        {sidebarButton}
        {replyButton}
      </div>
    </div>
  );
}

function getIconPosition(
  rect: ClientRect,
  containerPosition: PositionInfo,
): ItemAndContainerPositionInfo {
  const { top, bottom, left, right, width, height } = rect;
  return {
    containerPosition,
    itemPosition: {
      top:
        top - containerPosition.top + messageActionIconExcessVerticalWhitespace,
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

export default MessageTooltip;
