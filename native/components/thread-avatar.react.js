// @flow

import * as React from 'react';

import {
  useGetAvatarForThread,
  useAvatarForUserID,
} from 'lib/shared/avatar-utils.js';
import {
  threadInfoFromRawThreadInfo,
  getSingleOtherUser,
} from 'lib/shared/thread-utils.js';
import { threadTypes } from 'lib/types/thread-types.js';

import Avatar from './avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +threadID: string,
  +size: 'micro' | 'small' | 'large' | 'profile',
};

function ThreadAvatar(props: Props): React.Node {
  const { threadID, size } = props;

  const rawThreadInfo = useSelector(
    state => state.threadStore.threadInfos[threadID],
  );
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const userInfos = useSelector(state => state.userStore.userInfos);

  const threadInfo = threadInfoFromRawThreadInfo(
    rawThreadInfo,
    viewerID,
    userInfos,
  );

  const avatarInfo = useGetAvatarForThread(threadInfo);

  let userIDForThread;
  if (threadInfo.type === threadTypes.PRIVATE) {
    userIDForThread = viewerID;
  } else if (threadInfo.type === threadTypes.PERSONAL) {
    userIDForThread = getSingleOtherUser(threadInfo, viewerID);
  }

  const threadAvatar = useAvatarForUserID(userIDForThread, avatarInfo);

  return <Avatar size={size} avatarInfo={threadAvatar} />;
}

export default ThreadAvatar;
