// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { stringForUserExplicit } from 'lib/shared/user-utils.js';
import type { UserInfo } from 'lib/types/user-types';

import css from './user-profile.css';
import UserAvatar from '../../avatars/user-avatar.react.js';

type Props = {
  +userInfo: ?UserInfo,
};

function UserProfile(props: Props): React.Node {
  const { userInfo } = props;

  const usernameText = stringForUserExplicit(userInfo);

  const userProfile = React.useMemo(
    () => (
      <div className={css.container}>
        <UserAvatar userID={userInfo?.id} size="L" />
        <div className={css.usernameContainer}>
          <div className={css.usernameText}>{usernameText}</div>
          <div className={css.copyUsernameContainer}>
            <SWMansionIcon icon="copy" size={16} />
            <p className={css.copyUsernameText}>Copy username</p>
          </div>
        </div>
      </div>
    ),
    [userInfo?.id, usernameText],
  );

  return userProfile;
}

export default UserProfile;
