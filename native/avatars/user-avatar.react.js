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
};

function UserAvatar(props: Props): React.Node {
  const { userID, size } = props;

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const userInfo = useSelector(state =>
    userID ? state.userStore.userInfos[userID] : null,
  );

  const avatarUserInfo =
    userID === currentUserInfo?.id ? currentUserInfo : userInfo;
  const avatarInfo = getAvatarForUser(avatarUserInfo);

  const resolvedUserAvatar = useENSResolvedAvatar(avatarInfo, userInfo);

  return <Avatar size={size} avatarInfo={resolvedUserAvatar} />;
}

export default UserAvatar;
