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
import {
  findTooltipPosition,
  tooltipPositions,
  type TooltipPosition,
} from './tooltip-utils';

const ellipsisIconExcessVerticalWhitespace = 10;

type Props = {|
  +onLeave: () => void,
  +onButtonClick: (event: SyntheticEvent<HTMLAnchorElement>) => void,
  +buttonText: string,
  +containerPosition: PositionInfo,
  +availableTooltipPositions: $ReadOnlyArray<TooltipPosition>,
|};
function SidebarTooltipButton(props: Props) {
  const {
    onLeave,
    onButtonClick,
    buttonText,
    containerPosition,
    availableTooltipPositions,
  } = props;
  const [tooltipVisible, setTooltipVisible] = React.useState(false);
  const [pointingTo, setPointingTo] = React.useState();

  const toggleMenu = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
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

  const toggleSidebar = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      onButtonClick(event);
      onLeave();
    },
    [onLeave, onButtonClick],
  );

  const hideMenu = React.useCallback(() => {
    setTooltipVisible(false);
  }, []);

  const tooltipPosition = React.useMemo(() => {
    if (!pointingTo) {
      return null;
    }
    return findTooltipPosition({
      pointingToInfo: pointingTo,
      tooltipTexts: [buttonText],
      availablePositions: availableTooltipPositions,
      layoutPosition: 'relative',
    });
  }, [availableTooltipPositions, pointingTo, buttonText]);

  const sidebarTooltip = React.useMemo(() => {
    if (!tooltipVisible || !tooltipPosition) {
      return null;
    }
    return (
      <TooltipButton
        onButtonClick={toggleSidebar}
        buttonText={buttonText}
        tooltipPosition={tooltipPosition}
      />
    );
  }, [buttonText, toggleSidebar, tooltipPosition, tooltipVisible]);

  return (
    <div className={css.messageSidebarTooltip}>
      <div
        className={css.messageTooltipIcon}
        onMouseLeave={hideMenu}
        onClick={toggleMenu}
      >
        <FontAwesomeIcon icon={faEllipsisH} />
        {sidebarTooltip}
      </div>
    </div>
  );
}

type TooltipButtonProps = {|
  +onButtonClick: (event: SyntheticEvent<HTMLAnchorElement>) => void,
  +buttonText: string,
  +tooltipPosition: TooltipPosition,
|};
function TooltipButton(props: TooltipButtonProps) {
  const { onButtonClick, buttonText, tooltipPosition } = props;
  const sidebarStyle = React.useMemo(
    () => getSidebarTooltipStyle(tooltipPosition),
    [tooltipPosition],
  );

  const sidebarMenuClassName = React.useMemo(
    () => classNames(css.menuSidebarContent, sidebarStyle),
    [sidebarStyle],
  );

  return (
    <div className={sidebarMenuClassName}>
      <ul>
        <li>
          <button onClick={onButtonClick}>{buttonText}</button>
        </li>
      </ul>
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
    <SidebarTooltipButton
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
    <SidebarTooltipButton
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
function MessageActionTooltip(props: MessageActionTooltipProps) {
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

function getSidebarTooltipStyle(tooltipPosition: TooltipPosition): string {
  let className;
  if (tooltipPosition === tooltipPositions.TOP_RIGHT) {
    className = classNames(
      css.menuSidebarTopRightTooltip,
      css.messageTopRightTooltip,
      css.menuSidebarExtraAreaTop,
      css.menuSidebarExtraAreaTopRight,
    );
  } else if (tooltipPosition === tooltipPositions.TOP_LEFT) {
    className = classNames(
      css.menuSidebarTopLeftTooltip,
      css.messageTopLeftTooltip,
      css.menuSidebarExtraAreaTop,
      css.menuSidebarExtraAreaTopLeft,
    );
  } else if (tooltipPosition === tooltipPositions.RIGHT) {
    className = classNames(
      css.menuSidebarRightTooltip,
      css.messageRightTooltip,
      css.menuSidebarExtraArea,
      css.menuSidebarExtraAreaRight,
    );
  } else if (tooltipPosition === tooltipPositions.LEFT) {
    className = classNames(
      css.menuSidebarLeftTooltip,
      css.messageLeftTooltip,
      css.menuSidebarExtraArea,
      css.menuSidebarExtraAreaLeft,
    );
  }

  invariant(className, `${tooltipPosition} is not valid for sidebar tooltip`);
  return className;
}

export default MessageActionTooltip;
