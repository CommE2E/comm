// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import type { ThreadInfo } from 'lib/types/thread-types';

import {
  useOnClickThread,
  useOnClickPendingSidebar,
} from '../selectors/nav-selectors';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './message-action-buttons.css';
import type {
  ItemAndContainerPositionInfo,
  PositionInfo,
} from './position-types';
import { tooltipPositions, type TooltipPosition } from './tooltip-utils';
import { TooltipMenu, type TooltipStyle, TooltipButton } from './tooltip.react';

const ellipsisIconExcessVerticalWhitespace = 10;

const openSidebarText = 'Go to sidebar';
const createSidebarText = 'Create sidebar';

type MessageActionButtonsProps = {
  +threadInfo: ThreadInfo,
  +item: ChatMessageInfoItem,
  +containerPosition: PositionInfo,
  +availableTooltipPositions: $ReadOnlyArray<TooltipPosition>,
};
function MessageActionButtons(props: MessageActionButtonsProps): React.Node {
  const {
    threadInfo,
    item,
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
        <TooltipButton
          text={sidebarTooltipButtonText}
          onClick={onSidebarButtonClick}
        />
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
        <SWMansionIcon icon="message-circle-lines" size={18} />
        {tooltipMenu}
      </div>
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
