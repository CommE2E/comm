// @flow

import * as React from 'react';

import css from './friend-list-row.css';
import type { UserRowProps } from './user-list.react';

function FriendListRow(props: UserRowProps): React.Node {
  const { userInfo } = props;

  return <div className={css.container}>{userInfo.username}</div>;
}

export default FriendListRow;
