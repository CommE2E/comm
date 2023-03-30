// @flow

import * as React from 'react';

import { useENSAvatar } from 'lib/hooks/ens-cache.js';
import { userIdentifiedByETHAddress } from 'lib/shared/account-utils.js';
import {
  defaultAnonymousUserEmojiAvatar,
  getAvatarForUser,
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

  const ethAddress = React.useMemo(() => {
    let address = null;
    if (userInfo && avatarInfo.type === 'ens') {
      const { username } = userInfo;
      address =
        username && userIdentifiedByETHAddress(userInfo) ? username : null;
    }
    return address;
  }, [avatarInfo.type, userInfo]);

  const ensAvatarURI = useENSAvatar(ethAddress);

  const userAvatarInfo = React.useMemo(() => {
    if (avatarInfo.type !== 'ens') {
      return avatarInfo;
    }

    if (ensAvatarURI) {
      return {
        type: 'image',
        uri: ensAvatarURI,
      };
    }

    return defaultAnonymousUserEmojiAvatar;
  }, [ensAvatarURI, avatarInfo]);

  return <Avatar size={size} avatarInfo={userAvatarInfo} />;
}

export default UserAvatar;
