// @flow

import * as React from 'react';

import css from './unread-badge.css';

type Props = {
  +unreadCount: number,
};

function UnreadBadge(props: Props): React.Node {
  const { unreadCount } = props;

  const unreadText = unreadCount > 99 ? '99+' : unreadCount;

  return <div className={css.container}>{unreadText}</div>;
}

export default UnreadBadge;
