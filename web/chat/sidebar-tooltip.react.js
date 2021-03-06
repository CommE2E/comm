// @flow

import { faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
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

type Props = {|
  +onLeave: () => void,
  +onButtonClick: (event: SyntheticEvent<HTMLAnchorElement>) => void,
  +messagePosition: 'left' | 'center' | 'right',
  +buttonText: string,
|};
function SidebarTooltipButton(props: Props) {
  const { onLeave, onButtonClick, messagePosition, buttonText } = props;
  const [tooltipVisible, setTooltipVisible] = React.useState(false);

  const toggleMenu = React.useCallback(() => {
    setTooltipVisible(!tooltipVisible);
  }, [tooltipVisible]);

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

  const sidebarMenuClassName = classNames({
    [css.menuSidebarContent]: true,
    [css.menuSidebarContentVisible]: tooltipVisible,
    [css.menuSidebarNonViewerContent]: messagePosition === 'left',
    [css.messageTimestampBottomRightTooltip]: messagePosition !== 'left',
    [css.messageTimestampBottomLeftTooltip]: messagePosition === 'left',
  });

  return (
    <div className={css.messageSidebarTooltip}>
      <div
        className={css.messageTooltipIcon}
        onClick={toggleMenu}
        onMouseLeave={hideMenu}
      >
        <FontAwesomeIcon icon={faEllipsisH} />
        <div className={sidebarMenuClassName}>
          <ul>
            <li>
              <button onClick={toggleSidebar}>{buttonText}</button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

type OpenSidebarProps = {|
  +threadCreatedFromMessage: ThreadInfo,
  +onLeave: () => void,
  +messagePosition: 'left' | 'center' | 'right',
|};
function OpenSidebar(props: OpenSidebarProps) {
  const onButtonClick = useOnClickThread(props.threadCreatedFromMessage.id);
  return (
    <SidebarTooltipButton
      onButtonClick={onButtonClick}
      onLeave={props.onLeave}
      messagePosition={props.messagePosition}
      buttonText="Go to sidebar"
    />
  );
}

type CreateSidebarProps = {|
  +threadInfo: ThreadInfo,
  +messageInfo: ComposableMessageInfo | RobotextMessageInfo,
  +onLeave: () => void,
  +messagePosition: 'left' | 'center' | 'right',
|};
function CreateSidebar(props: CreateSidebarProps) {
  const onButtonClick = useOnClickPendingSidebar(
    props.messageInfo,
    props.threadInfo,
  );
  return (
    <SidebarTooltipButton
      onButtonClick={onButtonClick}
      onLeave={props.onLeave}
      messagePosition={props.messagePosition}
      buttonText="Create sidebar"
    />
  );
}

type SidebarTooltipProps = {|
  +threadInfo: ThreadInfo,
  +item: ChatMessageInfoItem,
  +onLeave: () => void,
  +messagePosition: 'left' | 'center' | 'right',
|};
function SidebarTooltip(props: SidebarTooltipProps) {
  const { threadInfo, item, onLeave, messagePosition } = props;
  if (item.threadCreatedFromMessage) {
    return (
      <OpenSidebar
        threadCreatedFromMessage={item.threadCreatedFromMessage}
        onLeave={onLeave}
        messagePosition={messagePosition}
      />
    );
  } else {
    return (
      <CreateSidebar
        threadInfo={threadInfo}
        messageInfo={item.messageInfo}
        onLeave={onLeave}
        messagePosition={messagePosition}
      />
    );
  }
}

export default SidebarTooltip;
