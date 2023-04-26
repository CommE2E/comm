// @flow

import invariant from 'invariant';
import * as React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types.js';

import {
  useSelectFromGalleryAndUpdateThreadAvatar,
  useShowAvatarActionSheet,
} from './avatar-hooks.js';
import EditAvatarBadge from './edit-avatar-badge.react.js';
import { EditThreadAvatarContext } from './edit-thread-avatar-provider.react.js';
import ThreadAvatar from './thread-avatar.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +threadInfo: RawThreadInfo | ThreadInfo,
  +onPressEmojiAvatarFlow: () => mixed,
  +disabled?: boolean,
};
function EditThreadAvatar(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { threadInfo, onPressEmojiAvatarFlow, disabled } = props;

  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext should be set');
  const { threadAvatarSaveInProgress, removeThreadAvatar } =
    editThreadAvatarContext;

  const [selectFromGalleryAndUpdateThreadAvatar, isGalleryAvatarUpdateLoading] =
    useSelectFromGalleryAndUpdateThreadAvatar(threadInfo.id);

  const isAvatarUpdateInProgress =
    isGalleryAvatarUpdateLoading || threadAvatarSaveInProgress;

  const actionSheetConfig = React.useMemo(() => {
    const configOptions = [
      { id: 'emoji', onPress: onPressEmojiAvatarFlow },
      { id: 'image', onPress: selectFromGalleryAndUpdateThreadAvatar },
    ];

    if (threadInfo.avatar) {
      configOptions.push({ id: 'remove', onPress: removeThreadAvatar });
    }

    return configOptions;
  }, [
    onPressEmojiAvatarFlow,
    removeThreadAvatar,
    selectFromGalleryAndUpdateThreadAvatar,
    threadInfo.avatar,
  ]);

  const showAvatarActionSheet = useShowAvatarActionSheet(actionSheetConfig);

  let spinner;
  if (isAvatarUpdateInProgress) {
    spinner = (
      <View style={styles.spinnerContainer}>
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={showAvatarActionSheet} disabled={disabled}>
      <ThreadAvatar threadInfo={threadInfo} size="profile" />
      {spinner}
      {!disabled ? <EditAvatarBadge /> : null}
    </TouchableOpacity>
  );
}

const unboundStyles = {
  spinnerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
};

export default EditThreadAvatar;
