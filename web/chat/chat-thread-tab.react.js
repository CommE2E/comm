// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon from '../SWMansionIcon.react';
import css from './chat-tabs.css';

type Props = {
  +title: string,
  +onClick: (title: string) => void,
  +tabIsActive: boolean,
  +icon: string,
};
function ChatThreadTab(props: Props): React.Node {
  const { title, onClick, tabIsActive, icon } = props;
  const className = classNames({
    [css.tabItem]: true,
    [css.tabItemActive]: tabIsActive,
    [css.tabItemInactive]: !tabIsActive,
  });
  return (
    <div className={className} onClick={onClick}>
      <span>
        <SWMansionIcon icon={icon} size={24} />
        {title}
      </span>
    </div>
  );
}

export default ChatThreadTab;
