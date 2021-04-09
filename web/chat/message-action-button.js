// @flow

import { faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import {
  type ComposableMessageInfo,
  type RobotextMessageInfo,
} from 'lib/types/message-types';
import type { ThreadInfo } from 'lib/types/thread-types';

import {
  useOnClickThread,
  useOnClickPendingSidebar,
} from '../selectors/nav-selectors';
import css from './chat-message-list.css';
import type {
  ItemAndContainerPositionInfo,
  PositionInfo,
} from './position-types';
import { tooltipPositions, type TooltipPosition } from './tooltip-utils';
import { TooltipMenu, type TooltipStyle, TooltipButton } from './tooltip.react';

const ellipsisIconExcessVerticalWhitespace = 10;

type Props = {|
  +onLeave: () => void,
  +onButtonClick: (event: SyntheticEvent<HTMLButtonElement>) => void,
  +buttonText: string,
  +containerPosition: PositionInfo,
  +availableTooltipPositions: $ReadOnlyArray<TooltipPosition>,
|};
function MessageActionMenu(props: Props) {
  const {
    onLeave,
    onButtonClick,
    buttonText,
    containerPosition,
    availableTooltipPositions,
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

      const dotsPosition: ItemAndContainerPositionInfo = {
        containerPosition,
        itemPosition: {
          top:
            top - containerPosition.top + ellipsisIconExcessVerticalWhitespace,
          bottom:
            bottom -
            containerPosition.top -
            ellipsisIconExcessVerticalWhitespace,
          left: left - containerPosition.left,
          right: right - containerPosition.left,
          width,
          height: height - ellipsisIconExcessVerticalWhitespace * 2,
        },
      };
      setPointingTo(dotsPosition);
    },
    [containerPosition, tooltipVisible],
  );

  const onTooltipButtonClick = React.useCallback(
    (event: SyntheticEvent<HTMLButtonElement>) => {
      onButtonClick(event);
      onLeave();
    },
    [onLeave, onButtonClick],
  );

  const hideTooltip = React.useCallback(() => {
    setTooltipVisible(false);
  }, []);

  let tooltipMenu = null;
  if (pointingTo && tooltipVisible) {
    tooltipMenu = (
      <TooltipMenu
        availableTooltipPositions={availableTooltipPositions}
        targetPositionInfo={pointingTo}
        layoutPosition="relative"
        getStyle={getMessageActionTooltipStyle}
      >
        <TooltipButton text={buttonText} onClick={onTooltipButtonClick} />
      </TooltipMenu>
    );
  }

  return (
    <div className={css.messageActionButton}>
      <div
        className={css.messageActionLinkIcon}
        onMouseLeave={hideTooltip}
        onClick={toggleTooltip}
      >
        <FontAwesomeIcon icon={faEllipsisH} />
        {tooltipMenu}
      </div>
    </div>
  );
}

const openSidebarText = 'Go to sidebar';
type OpenSidebarProps = {|
  +threadCreatedFromMessage: ThreadInfo,
  +onLeave: () => void,
  +containerPosition: PositionInfo,
  +availableTooltipPositions: $ReadOnlyArray<TooltipPosition>,
|};
function OpenSidebar(props: OpenSidebarProps) {
  const {
    threadCreatedFromMessage,
    onLeave,
    containerPosition,
    availableTooltipPositions,
  } = props;
  const onButtonClick = useOnClickThread(threadCreatedFromMessage.id);

  return (
    <MessageActionMenu
      onButtonClick={onButtonClick}
      onLeave={onLeave}
      buttonText={openSidebarText}
      containerPosition={containerPosition}
      availableTooltipPositions={availableTooltipPositions}
    />
  );
}

const createSidebarText = 'Create sidebar';
type CreateSidebarProps = {|
  +threadInfo: ThreadInfo,
  +messageInfo: ComposableMessageInfo | RobotextMessageInfo,
  +onLeave: () => void,
  +containerPosition: PositionInfo,
  +availableTooltipPositions: $ReadOnlyArray<TooltipPosition>,
|};
function CreateSidebar(props: CreateSidebarProps) {
  const {
    threadInfo,
    messageInfo,
    containerPosition,
    availableTooltipPositions,
  } = props;
  const onButtonClick = useOnClickPendingSidebar(messageInfo, threadInfo);

  return (
    <MessageActionMenu
      onButtonClick={onButtonClick}
      onLeave={props.onLeave}
      buttonText={createSidebarText}
      containerPosition={containerPosition}
      availableTooltipPositions={availableTooltipPositions}
    />
  );
}

type MessageActionTooltipProps = {|
  +threadInfo: ThreadInfo,
  +item: ChatMessageInfoItem,
  +onLeave: () => void,
  +containerPosition: PositionInfo,
  +availableTooltipPositions: $ReadOnlyArray<TooltipPosition>,
|};
function MessageActionButton(props: MessageActionTooltipProps) {
  const {
    threadInfo,
    item,
    onLeave,
    containerPosition,
    availableTooltipPositions,
  } = props;
  if (item.threadCreatedFromMessage) {
    return (
      <OpenSidebar
        threadCreatedFromMessage={item.threadCreatedFromMessage}
        onLeave={onLeave}
        containerPosition={containerPosition}
        availableTooltipPositions={availableTooltipPositions}
      />
    );
  } else {
    return (
      <CreateSidebar
        threadInfo={threadInfo}
        messageInfo={item.messageInfo}
        onLeave={onLeave}
        containerPosition={containerPosition}
        availableTooltipPositions={availableTooltipPositions}
      />
    );
  }
}

function getMessageActionTooltipStyle(
  tooltipPosition: TooltipPosition,
): TooltipStyle {
  let className;
  if (tooltipPosition === tooltipPositions.TOP_RIGHT) {
    className = classNames(
      css.messageActionTopRightTooltip,
      css.messageTopRightTooltip,
      css.messageActionExtraAreaTop,
      css.messageActionExtraAreaTopRight,
    );
  } else if (tooltipPosition === tooltipPositions.TOP_LEFT) {
    className = classNames(
      css.messageActionTopLeftTooltip,
      css.messageTopLeftTooltip,
      css.messageActionExtraAreaTop,
      css.messageActionExtraAreaTopLeft,
    );
  } else if (tooltipPosition === tooltipPositions.RIGHT) {
    className = classNames(
      css.messageActionRightTooltip,
      css.messageRightTooltip,
      css.messageActionExtraArea,
      css.messageActionExtraAreaRight,
    );
  } else if (tooltipPosition === tooltipPositions.LEFT) {
    className = classNames(
      css.messageActionLeftTooltip,
      css.messageLeftTooltip,
      css.messageActionExtraArea,
      css.messageActionExtraAreaLeft,
    );
  }

  invariant(className, `${tooltipPosition} is not valid for message tooltip`);
  return { className };
}

export default MessageActionButton;
