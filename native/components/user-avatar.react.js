// @flow

import * as React from 'react';

import {
  getAvatarForUser,
  useAvatarForUserID,
} from 'lib/shared/avatar-utils.js';

import Avatar from './avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +userID: ?string,
  +size: 'micro' | 'small' | 'large' | 'profile',
};

function UserAvatar(props: Props): React.Node {
  const { userID, size } = props;

  const userInfo = useSelector(state =>
    userID ? state.userStore.userInfos[userID] : null,
  );
  const avatarInfo = getAvatarForUser(userInfo);

  const userAvatar = useAvatarForUserID(userID, avatarInfo);

  return <Avatar size={size} avatarInfo={userAvatar} />;
}

export default UserAvatar;
