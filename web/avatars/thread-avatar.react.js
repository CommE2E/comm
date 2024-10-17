// @flow

import * as React from 'react';

import { useAvatarForThread } from 'lib/hooks/avatar-hooks.js';
import { useResolvedThreadAvatar } from 'lib/shared/avatar-utils.js';
import { getSingleOtherUser, getCommunity } from 'lib/shared/thread-utils.js';
import type { AvatarSize } from 'lib/types/avatar-types.js';
import type { CommunityInfo } from 'lib/types/community-types.js';
import type {
  ThreadInfo,
  RawThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import {
  threadTypeIsPersonal,
  threadTypeIsPrivate,
} from 'lib/types/thread-types-enum.js';

import Avatar from './avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +threadInfo: RawThreadInfo | ThreadInfo,
  +size: AvatarSize,
  +showSpinner?: boolean,
};

function ThreadAvatar(props: Props): React.Node {
  const { threadInfo, size, showSpinner } = props;

  const avatarInfo = useAvatarForThread(threadInfo);

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const communityID = getCommunity(threadInfo);
  const communityInfo: ?CommunityInfo = useSelector(state => {
    if (!communityID) {
      return null;
    }
    return state.communityStore.communityInfos[communityID];
  });

  let displayUserIDForThread;
  if (threadTypeIsPrivate(threadInfo.type)) {
    displayUserIDForThread = viewerID;
  } else if (threadTypeIsPersonal(threadInfo.type)) {
    displayUserIDForThread = getSingleOtherUser(threadInfo, viewerID);
  }

  const displayUser = useSelector(state => {
    if (!displayUserIDForThread) {
      return null;
    }

    const userBase = state.userStore.userInfos[displayUserIDForThread];
    const farcasterID =
      state.auxUserStore.auxUserInfos[displayUserIDForThread]?.fid;

    return {
      ...userBase,
      farcasterID,
    };
  });

  const resolvedThreadAvatar = useResolvedThreadAvatar(avatarInfo, {
    userProfileInfo: displayUser,
    channelInfo: { fcChannelID: communityInfo?.farcasterChannelID },
  });

  return (
    <Avatar
      size={size}
      avatarInfo={resolvedThreadAvatar}
      showSpinner={showSpinner}
    />
  );
}

export default ThreadAvatar;
