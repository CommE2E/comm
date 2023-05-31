// @flow

import * as React from 'react';

import {
  getAvatarForUser,
  useENSResolvedAvatar,
} from 'lib/shared/avatar-utils.js';
import type { GenericUserInfoWithAvatar } from 'lib/types/avatar-types.js';

import Avatar from './avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Size = 'micro' | 'small' | 'large' | 'profile';
type Props =
  | { +userID: ?string, +size: Size }
  | { +userInfo: ?GenericUserInfoWithAvatar, +size: Size };
function UserAvatar(props: Props): React.Node {
  const { userID, userInfo: userInfoProp, size } = props;

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const userInfo = useSelector(state =>
    userID ? state.userStore.userInfos[userID] : userInfoProp,
  );

  const avatarUserInfo =
    userID === currentUserInfo?.id ? currentUserInfo : userInfo;
  const avatarInfo = getAvatarForUser(avatarUserInfo);

  const resolvedUserAvatar = useENSResolvedAvatar(avatarInfo, userInfo);

  return <Avatar size={size} avatarInfo={resolvedUserAvatar} />;
}

export default UserAvatar;
