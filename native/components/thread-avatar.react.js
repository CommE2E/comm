// @flow

import * as React from 'react';

import {
  useGetAvatarForThread,
  useENSResolvedAvatar,
} from 'lib/shared/avatar-utils.js';
import { getSingleOtherUser } from 'lib/shared/thread-utils.js';
import {
  threadTypes,
  type RawThreadInfo,
  type ThreadInfo,
} from 'lib/types/thread-types.js';

import Avatar from './avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +threadInfo: RawThreadInfo | ThreadInfo,
  +size: 'micro' | 'small' | 'large' | 'profile',
};

function ThreadAvatar(props: Props): React.Node {
  const { threadInfo, size } = props;

  const avatarInfo = useGetAvatarForThread(threadInfo);

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  let displayUserIDForThread;
  if (threadInfo.type === threadTypes.PRIVATE) {
    displayUserIDForThread = viewerID;
  } else if (threadInfo.type === threadTypes.PERSONAL) {
    displayUserIDForThread = getSingleOtherUser(threadInfo, viewerID);
  }

  const userInfos = useSelector(state => state.userStore.userInfos);
  const displayUser = displayUserIDForThread
    ? userInfos[displayUserIDForThread]
    : null;

  const resolvedThreadAvatar = useENSResolvedAvatar(avatarInfo, displayUser);

  return <Avatar size={size} avatarInfo={resolvedThreadAvatar} />;
}

export default ThreadAvatar;
