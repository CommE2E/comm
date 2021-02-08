// @flow

import { faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types';

import { useOnClickThread } from '../selectors/nav-selectors';
import css from './chat-message-list.css';
import type { OnMessagePositionInfo } from './message-position-types';

type Props = {|
  +messagePositionInfo: OnMessagePositionInfo,
  +threadCreatedFromMessage: ThreadInfo,
  +onClick: () => void,
|};
function SidebarTooltip(props: Props) {
  const { onClick, messagePositionInfo, threadCreatedFromMessage } = props;
  const [tooltipVisible, setTooltipVisible] = React.useState(false);
  const onButtonClick = useOnClickThread(threadCreatedFromMessage.id);

  const toggleMenu = React.useCallback(() => {
    setTooltipVisible(!tooltipVisible);
  }, [tooltipVisible]);

  const toggleSidebar = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      onButtonClick(event);
      onClick();
    },
    [onClick, onButtonClick],
  );

  const hideMenu = React.useCallback(() => {
    setTooltipVisible(false);
  }, []);

  const { isViewer } = messagePositionInfo.item.messageInfo.creator;
  const sidebarMenuClassName = classNames({
    [css.menuSidebarContent]: true,
    [css.menuSidebarContentVisible]: tooltipVisible,
    [css.menuSidebarNonViewerContent]: !isViewer,
    [css.messageTimestampBottomRightTooltip]: isViewer,
    [css.messageTimestampBottomLeftTooltip]: !isViewer,
  });

  const sidebarTooltipClassName = classNames({
    [css.messageTooltip]: true,
    [css.messageSidebarTooltip]: true,
    [css.tooltipRightPadding]: isViewer,
    [css.tooltipLeftPadding]: !isViewer,
  });

  const sidebarIconClassName = classNames({
    [css.messageTooltipIcon]: true,
    [css.tooltipRightPadding]: !isViewer,
    [css.tooltipLeftPadding]: isViewer,
  });

  return (
    <div className={sidebarTooltipClassName}>
      <div
        className={sidebarIconClassName}
        onClick={toggleMenu}
        onMouseLeave={hideMenu}
      >
        <FontAwesomeIcon icon={faEllipsisH} />
        <div className={sidebarMenuClassName}>
          <ul>
            <li>
              <button onClick={toggleSidebar}>Go to sidebar</button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default SidebarTooltip;
