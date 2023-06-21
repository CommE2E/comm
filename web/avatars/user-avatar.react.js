// @flow

import * as React from 'react';

import {
  getAvatarForUser,
  useENSResolvedAvatar,
} from 'lib/shared/avatar-utils.js';

import Avatar from './avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +userID: ?string,
  +size: 'micro' | 'small' | 'large' | 'profile',
  +showSpinner?: boolean,
};

function UserAvatar(props: Props): React.Node {
  const { userID, size, showSpinner } = props;

  const userInfo = useSelector(state =>
    userID ? state.userStore.userInfos[userID] : null,
  );
  const avatarInfo = getAvatarForUser(userInfo);

  const resolvedUserAvatar = useENSResolvedAvatar(avatarInfo, userInfo);

  return (
    <Avatar
      size={size}
      avatarInfo={resolvedUserAvatar}
      showSpinner={showSpinner}
    />
  );
}

export default UserAvatar;
