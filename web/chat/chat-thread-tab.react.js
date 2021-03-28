// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './chat-tabs.css';

type Props = {|
  title: string,
  onClick: (title: string) => void,
  tabIsActive: boolean,
|};
function ChatThreadTab(props: Props): React.Node {
  const className = classNames({
    [css.tabItem]: true,
    [css.tabItemActive]: props.tabIsActive,
    [css.tabItemInactive]: !props.tabIsActive,
  });
  return (
    <div className={className} onClick={props.onClick}>
      {props.title}
    </div>
  );
}

export default ChatThreadTab;
