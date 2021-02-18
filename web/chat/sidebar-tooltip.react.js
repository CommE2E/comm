// @flow

import { faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types';

import { useOnClickThread } from '../selectors/nav-selectors';
import css from './chat-message-list.css';

type Props = {|
  +threadCreatedFromMessage: ThreadInfo,
  +onClick: () => void,
  +messagePosition: 'left' | 'center' | 'right',
|};
function SidebarTooltip(props: Props) {
  const { onClick, threadCreatedFromMessage, messagePosition } = props;
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

  const sidebarMenuClassName = classNames({
    [css.menuSidebarContent]: true,
    [css.menuSidebarContentVisible]: tooltipVisible,
    [css.menuSidebarNonViewerContent]: messagePosition === 'left',
    [css.menuSidebarCenterContent]: messagePosition === 'center',
    [css.messageTimestampBottomRightTooltip]: messagePosition !== 'left',
    [css.messageTimestampBottomLeftTooltip]: messagePosition === 'left',
  });

  const sidebarTooltipClassName = classNames({
    [css.messageSidebarTooltip]: true,
    [css.viewerMessageSidebarTooltip]: messagePosition === 'right',
    [css.tooltipRightPadding]: messagePosition === 'right',
    [css.tooltipLeftPadding]: messagePosition !== 'right',
  });

  const sidebarIconClassName = classNames({
    [css.messageTooltipIcon]: true,
    [css.tooltipRightPadding]: messagePosition === 'left',
    [css.tooltipLeftPadding]: messagePosition === 'right',
    [css.tooltipLeftRightPadding]: messagePosition === 'center',
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
