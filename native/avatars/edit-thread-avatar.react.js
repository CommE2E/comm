// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import type { RawThreadInfo, ThreadInfo } from 'lib/types/thread-types.js';

import {
  useRemoveThreadAvatar,
  useSelectFromGalleryAndUpdateThreadAvatar,
  useSelectFromCameraAndUpdateThreadAvatar,
  useShowAvatarActionSheet,
} from './avatar-hooks.js';
import EditAvatarBadge from './edit-avatar-badge.react.js';
import ThreadAvatar from './thread-avatar.react.js';
import { ThreadAvatarCameraModalRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +threadInfo: RawThreadInfo | ThreadInfo,
  +onPressEmojiAvatarFlow: () => mixed,
  +disabled?: boolean,
};
function EditThreadAvatar(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { threadInfo, onPressEmojiAvatarFlow, disabled } = props;

  const [selectFromGalleryAndUpdateThreadAvatar, isGalleryAvatarUpdateLoading] =
    useSelectFromGalleryAndUpdateThreadAvatar(threadInfo.id);

  const [removeThreadAvatar, isRemoveAvatarUpdateLoading] =
    useRemoveThreadAvatar(threadInfo.id);

  const { isCameraAvatarUpdateLoading } =
    useSelectFromCameraAndUpdateThreadAvatar(threadInfo.id);
  const navigation = useNavigation();
  const navigateToCamera = React.useCallback(() => {
    navigation.navigate<'ThreadAvatarCameraModal'>({
      name: ThreadAvatarCameraModalRouteName,
      params: { threadID: threadInfo.id },
    });
  }, [navigation, threadInfo.id]);

  const isAvatarUpdateInProgress =
    isGalleryAvatarUpdateLoading ||
    isCameraAvatarUpdateLoading ||
    isRemoveAvatarUpdateLoading;

  const actionSheetConfig = React.useMemo(
    () => [
      { id: 'emoji', onPress: onPressEmojiAvatarFlow },
      { id: 'image', onPress: selectFromGalleryAndUpdateThreadAvatar },
      { id: 'camera', onPress: navigateToCamera },
      { id: 'remove', onPress: removeThreadAvatar },
    ],
    [
      navigateToCamera,
      onPressEmojiAvatarFlow,
      removeThreadAvatar,
      selectFromGalleryAndUpdateThreadAvatar,
    ],
  );

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
