// @flow

import * as React from 'react';

import {
  getAvatarForUser,
  useResolvedUserAvatar,
} from 'lib/shared/avatar-utils.js';
import type {
  GenericUserInfoWithAvatar,
  AvatarSize,
} from 'lib/types/avatar-types.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';

import Avatar from './avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

// We have two variants for Props here because we want to be able to display a
// user avatar during the registration workflow, at which point the user will
// not yet have a user ID. In this case, we must pass the relevant avatar info
// into the component.
type Props =
  | { +userID: ?string, +size: AvatarSize }
  | { +userInfo: ?GenericUserInfoWithAvatar, +size: AvatarSize, +fid: ?string };
function UserAvatar(props: Props): React.Node {
  const { userID, userInfo: userInfoProp, size, fid } = props;

  const currentUserFID = useCurrentUserFID();
  const userAvatarInfo = useSelector(state => {
    if (!userID) {
      return {
        ...userInfoProp,
        farcasterID: fid,
      };
    } else if (userID === state.currentUserInfo?.id) {
      return {
        ...state.currentUserInfo,
        farcasterID: currentUserFID,
      };
    } else {
      return {
        ...state.userStore.userInfos[userID],
        farcasterID: state.auxUserStore.auxUserInfos[userID]?.fid,
      };
    }
  });

  const avatar = getAvatarForUser(userAvatarInfo);

  const resolvedUserAvatar = useResolvedUserAvatar(avatar, userAvatarInfo);

  return <Avatar size={size} avatarInfo={resolvedUserAvatar} />;
}

export default UserAvatar;
