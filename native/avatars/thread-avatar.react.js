// @flow

import * as React from 'react';

import {
  useAvatarForThread,
  useENSResolvedAvatar,
} from 'lib/shared/avatar-utils.js';
import { getSingleOtherUser } from 'lib/shared/thread-utils.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { type RawThreadInfo, type ThreadInfo } from 'lib/types/thread-types.js';

import Avatar, { type AvatarSize } from './avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +threadInfo: RawThreadInfo | ThreadInfo,
  +size: AvatarSize,
};

function ThreadAvatar(props: Props): React.Node {
  const { threadInfo, size } = props;

  const avatarInfo = useAvatarForThread(threadInfo);

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  let displayUserIDForThread;
  if (threadInfo.type === threadTypes.PRIVATE) {
    displayUserIDForThread = viewerID;
  } else if (threadInfo.type === threadTypes.PERSONAL) {
    displayUserIDForThread = getSingleOtherUser(threadInfo, viewerID);
  }

  const displayUser = useSelector(state =>
    displayUserIDForThread
      ? state.userStore.userInfos[displayUserIDForThread]
      : null,
  );

  const resolvedThreadAvatar = useENSResolvedAvatar(avatarInfo, displayUser);

  return <Avatar size={size} avatarInfo={resolvedThreadAvatar} />;
}

export default ThreadAvatar;
