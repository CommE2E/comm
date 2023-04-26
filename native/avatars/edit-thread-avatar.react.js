// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types.js';

import { useShowAvatarActionSheet } from './avatar-hooks.js';
import EditAvatarBadge from './edit-avatar-badge.react.js';
import { EditThreadAvatarContext } from './edit-thread-avatar-provider.react.js';
import ThreadAvatar from './thread-avatar.react.js';
import { EmojiThreadAvatarCreationRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +threadInfo: RawThreadInfo | ThreadInfo,
  +disabled?: boolean,
};
function EditThreadAvatar(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { threadInfo, disabled } = props;

  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext should be set');
  const {
    threadAvatarSaveInProgress,
    selectFromGalleryAndUpdateThreadAvatar,
    removeThreadAvatar,
  } = editThreadAvatarContext;

  const { navigate } = useNavigation();

  const navigateToThreadEmojiAvatarCreation = React.useCallback(() => {
    navigate<'EmojiThreadAvatarCreation'>({
      name: EmojiThreadAvatarCreationRouteName,
      params: {
        threadID: threadInfo.id,
        containingThreadID: threadInfo.containingThreadID,
      },
    });
  }, [navigate, threadInfo.containingThreadID, threadInfo.id]);

  const actionSheetConfig = React.useMemo(() => {
    const configOptions = [
      { id: 'emoji', onPress: navigateToThreadEmojiAvatarCreation },
      { id: 'image', onPress: selectFromGalleryAndUpdateThreadAvatar },
    ];

    if (threadInfo.avatar) {
      configOptions.push({ id: 'remove', onPress: removeThreadAvatar });
    }

    return configOptions;
  }, [
    navigateToThreadEmojiAvatarCreation,
    removeThreadAvatar,
    selectFromGalleryAndUpdateThreadAvatar,
    threadInfo.avatar,
  ]);

  const showAvatarActionSheet = useShowAvatarActionSheet(actionSheetConfig);

  let spinner;
  if (threadAvatarSaveInProgress) {
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
