// @flow

import * as React from 'react';

import {
  useAvatarForThread,
  useENSResolvedAvatar,
} from 'lib/shared/avatar-utils.js';
import { getSingleOtherUser } from 'lib/shared/thread-utils.js';
import type { AvatarSize } from 'lib/types/avatar-types.js';
import type {
  MinimallyEncodedThreadInfo,
  RawThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { LegacyThreadInfo } from 'lib/types/thread-types.js';

import Avatar from './avatar.react.js';
import { useSelector } from '../redux/redux-utils.js';

type Props = {
  +threadInfo: RawThreadInfo | LegacyThreadInfo | MinimallyEncodedThreadInfo,
  +size: AvatarSize,
  +showSpinner?: boolean,
};

function ThreadAvatar(props: Props): React.Node {
  const { threadInfo, size, showSpinner } = props;

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

  return (
    <Avatar
      size={size}
      avatarInfo={resolvedThreadAvatar}
      showSpinner={showSpinner}
    />
  );
}

export default ThreadAvatar;
