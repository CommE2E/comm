// @flow

import * as React from 'react';

import { useAvatarForThread } from 'lib/hooks/avatar-hooks.js';
import {
  useResolvedThreadAvatar,
  useDisplayUserForThread,
} from 'lib/shared/avatar-utils.js';
import { getSingleOtherUser, getCommunity } from 'lib/shared/thread-utils.js';
import {
  threadTypeIsPersonal,
  threadTypeIsPrivate,
} from 'lib/shared/threads/thread-specs.js';
import type { AvatarSize } from 'lib/types/avatar-types.js';
import type { CommunityInfo } from 'lib/types/community-types.js';
import type {
  ThreadInfo,
  ResolvedThreadInfo,
  RawThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';

import Avatar from './avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +threadInfo: RawThreadInfo | ThreadInfo | ResolvedThreadInfo,
  +size: AvatarSize,
  +farcasterChannelID?: ?string,
};

function ThreadAvatar(props: Props): React.Node {
  const { threadInfo, size, farcasterChannelID } = props;

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

  const userInfos = useSelector(state => state.userStore.userInfos);
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);

  const displayUser = useDisplayUserForThread(
    displayUserIDForThread,
    userInfos,
    auxUserInfos,
  );

  const resolvedThreadAvatar = useResolvedThreadAvatar(avatarInfo, {
    userProfileInfo: displayUser,
    channelInfo: {
      fcChannelID: farcasterChannelID ?? communityInfo?.farcasterChannelID,
    },
  });

  return <Avatar size={size} avatarInfo={resolvedThreadAvatar} />;
}

export default ThreadAvatar;
