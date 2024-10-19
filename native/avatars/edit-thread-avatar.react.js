// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import { EditThreadAvatarContext } from 'lib/components/base-edit-thread-avatar-provider.react.js';
import { getCommunity } from 'lib/shared/thread-utils.js';
import type { CommunityInfo } from 'lib/types/community-types.js';
import type {
  ThreadInfo,
  RawThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';

import {
  useNativeSetThreadAvatar,
  useSelectFromGalleryAndUpdateThreadAvatar,
  useShowAvatarActionSheet,
} from './avatar-hooks.js';
import EditAvatarBadge from './edit-avatar-badge.react.js';
import ThreadAvatar from './thread-avatar.react.js';
import {
  EmojiThreadAvatarCreationRouteName,
  ThreadAvatarCameraModalRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +threadInfo: RawThreadInfo | ThreadInfo,
  +disabled?: boolean,
};
function EditThreadAvatar(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { threadInfo, disabled } = props;

  const communityID = getCommunity(threadInfo);
  const communityInfo: ?CommunityInfo = useSelector(state => {
    if (!communityID) {
      return null;
    }
    return state.communityStore.communityInfos[communityID];
  });

  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext should be set');
  const { threadAvatarSaveInProgress } = editThreadAvatarContext;

  const nativeSetThreadAvatar = useNativeSetThreadAvatar();

  const selectFromGalleryAndUpdateThreadAvatar =
    useSelectFromGalleryAndUpdateThreadAvatar();

  const { navigate } = useNavigation();

  const navigateToThreadEmojiAvatarCreation = React.useCallback(() => {
    navigate<'EmojiThreadAvatarCreation'>({
      name: EmojiThreadAvatarCreationRouteName,
      params: {
        threadInfo,
      },
    });
  }, [navigate, threadInfo]);

  const selectFromGallery = React.useCallback(
    () => selectFromGalleryAndUpdateThreadAvatar(threadInfo),
    [selectFromGalleryAndUpdateThreadAvatar, threadInfo],
  );

  const navigateToCamera = React.useCallback(() => {
    navigate<'ThreadAvatarCameraModal'>({
      name: ThreadAvatarCameraModalRouteName,
      params: { threadInfo },
    });
  }, [navigate, threadInfo]);

  const setFarcasterThreadAvatar = React.useCallback(
    () => nativeSetThreadAvatar(threadInfo.id, { type: 'farcaster' }),
    [nativeSetThreadAvatar, threadInfo.id],
  );

  const removeAvatar = React.useCallback(
    () => nativeSetThreadAvatar(threadInfo.id, { type: 'remove' }),
    [nativeSetThreadAvatar, threadInfo.id],
  );

  const actionSheetConfig = React.useMemo(() => {
    const configOptions = [
      { id: 'emoji', onPress: navigateToThreadEmojiAvatarCreation },
      { id: 'image', onPress: selectFromGallery },
      { id: 'camera', onPress: navigateToCamera },
    ];

    if (communityInfo?.farcasterChannelID) {
      configOptions.push({
        id: 'farcaster',
        onPress: setFarcasterThreadAvatar,
      });
    }

    if (threadInfo.avatar) {
      configOptions.push({ id: 'remove', onPress: removeAvatar });
    }

    return configOptions;
  }, [
    navigateToCamera,
    navigateToThreadEmojiAvatarCreation,
    removeAvatar,
    selectFromGallery,
    threadInfo.avatar,
    communityInfo?.farcasterChannelID,
    setFarcasterThreadAvatar,
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
      <ThreadAvatar threadInfo={threadInfo} size="XL" />
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
