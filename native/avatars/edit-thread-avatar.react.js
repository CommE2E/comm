// @flow

import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types.js';

import {
  useRemoveThreadAvatar,
  useSelectFromGalleryAndUpdateThreadAvatar,
  useShowAvatarActionSheet,
} from './avatar-hooks.js';
import EditAvatarBadge from './edit-avatar-badge.react.js';
import ThreadAvatar from './thread-avatar.react.js';

type Props = {
  +threadInfo: RawThreadInfo | ThreadInfo,
  +onPressEmojiAvatarFlow: () => mixed,
  +disabled?: boolean,
};
function EditThreadAvatar(props: Props): React.Node {
  const { threadInfo, onPressEmojiAvatarFlow, disabled } = props;

  const selectFromGalleryAndUpdateThreadAvatar =
    useSelectFromGalleryAndUpdateThreadAvatar(threadInfo.id);

  const removeThreadAvatar = useRemoveThreadAvatar(threadInfo.id);

  const actionSheetConfig = React.useMemo(
    () => [
      { id: 'emoji', onPress: onPressEmojiAvatarFlow },
      { id: 'image', onPress: selectFromGalleryAndUpdateThreadAvatar },
      { id: 'remove', onPress: removeThreadAvatar },
    ],
    [
      onPressEmojiAvatarFlow,
      removeThreadAvatar,
      selectFromGalleryAndUpdateThreadAvatar,
    ],
  );

  const showAvatarActionSheet = useShowAvatarActionSheet(actionSheetConfig);

  return (
    <TouchableOpacity onPress={showAvatarActionSheet} disabled={disabled}>
      <ThreadAvatar threadInfo={threadInfo} size="profile" />
      {!disabled ? <EditAvatarBadge /> : null}
    </TouchableOpacity>
  );
}

export default EditThreadAvatar;
