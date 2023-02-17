// @flow

import * as React from 'react';

import css from './chat-tabs.css';

type Props = {
  +title: string,
};
function ChatThreadTab(props: Props): React.Node {
  const { title } = props;

  return <div className={css.tabItem}>{title}</div>;
}

export default ChatThreadTab;
