// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './chat-tabs.css';

type Props = {
  +title: string,
  +onClick: (title: string) => void,
  +tabIsActive: boolean,
};
function ChatThreadTab(props: Props): React.Node {
  const { title, onClick, tabIsActive } = props;
  const className = classNames({
    [css.tabItem]: true,
    [css.tabItemActive]: tabIsActive,
    [css.tabItemInactive]: !tabIsActive,
  });
  return (
    <div className={className} onClick={onClick}>
      {title}
    </div>
  );
}

export default ChatThreadTab;
