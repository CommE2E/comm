// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types';

import UserProfileMessageButton from './user-profile-message-button.react.js';
import css from './user-profile.css';

type Props = {
  +threadInfo: ThreadInfo,
};

function UserProfileActionButtons(props: Props): React.Node {
  const { threadInfo } = props;

  return (
    <div className={css.buttonsContainer}>
      <UserProfileMessageButton threadInfo={threadInfo} />
    </div>
  );
}

export default UserProfileActionButtons;
