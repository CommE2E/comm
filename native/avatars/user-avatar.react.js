// @flow

import * as React from 'react';

import {
  getAvatarForUser,
  useENSResolvedAvatar,
} from 'lib/shared/avatar-utils.js';
import type { GenericUserInfoWithAvatar } from 'lib/types/avatar-types.js';

import Avatar, { type AvatarSize } from './avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props =
  | { +userID: ?string, +size: AvatarSize }
  | { +userInfo: ?GenericUserInfoWithAvatar, +size: AvatarSize };
function UserAvatar(props: Props): React.Node {
  const { userID, userInfo: userInfoProp, size } = props;

  const userInfo = useSelector(state => {
    if (!userID) {
      return userInfoProp;
    } else if (userID === state.currentUserInfo?.id) {
      return state.currentUserInfo;
    } else {
      return state.userStore.userInfos[userID];
    }
  });

  const avatarInfo = getAvatarForUser(userInfo);

  const resolvedUserAvatar = useENSResolvedAvatar(avatarInfo, userInfo);

  return <Avatar size={size} avatarInfo={resolvedUserAvatar} />;
}

export default UserAvatar;
