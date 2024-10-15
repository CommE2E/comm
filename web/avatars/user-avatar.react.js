// @flow

import * as React from 'react';

import {
  getAvatarForUser,
  useResolvedUserAvatar,
} from 'lib/shared/avatar-utils.js';
import type { AvatarSize } from 'lib/types/avatar-types.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';

import Avatar from './avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +userID: ?string,
  +size: AvatarSize,
  +showSpinner?: boolean,
};

function UserAvatar(props: Props): React.Node {
  const { userID, size, showSpinner } = props;

  const currentUserFID = useCurrentUserFID();
  const userAvatarInfo = useSelector(state => {
    if (!userID) {
      return null;
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

  return (
    <Avatar
      size={size}
      avatarInfo={resolvedUserAvatar}
      showSpinner={showSpinner}
    />
  );
}

export default UserAvatar;
