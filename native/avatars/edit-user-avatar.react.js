// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import { useENSAvatar } from 'lib/hooks/ens-cache.js';
import { getETHAddressForUserInfo } from 'lib/shared/account-utils.js';
import type { GenericUserInfoWithAvatar } from 'lib/types/avatar-types.js';

import { useShowAvatarActionSheet } from './avatar-hooks.js';
import EditAvatarBadge from './edit-avatar-badge.react.js';
import { EditUserAvatarContext } from './edit-user-avatar-provider.react.js';
import UserAvatar from './user-avatar.react.js';
import {
  EmojiUserAvatarCreationRouteName,
  UserAvatarCameraModalRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

type Props =
  | { +userID: ?string, +disabled?: boolean }
  | { +userInfo: ?GenericUserInfoWithAvatar, +disabled?: boolean };
function EditUserAvatar(props: Props): React.Node {
  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');
  const {
    userAvatarSaveInProgress,
    selectFromGalleryAndUpdateUserAvatar,
    setUserAvatar,
  } = editUserAvatarContext;

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const userInfoProp = props.userInfo;
  const userInfo: ?GenericUserInfoWithAvatar = userInfoProp ?? currentUserInfo;

  const ethAddress = React.useMemo(
    () => getETHAddressForUserInfo(userInfo),
    [userInfo],
  );
  const ensAvatarURI = useENSAvatar(ethAddress);

  const { navigate } = useNavigation();

  const navigateToUserEmojiAvatarCreation = React.useCallback(() => {
    navigate(EmojiUserAvatarCreationRouteName);
  }, [navigate]);

  const navigateToCamera = React.useCallback(() => {
    navigate(UserAvatarCameraModalRouteName);
  }, [navigate]);

  const setENSUserAvatar = React.useCallback(() => {
    setUserAvatar({ type: 'ens' });
  }, [setUserAvatar]);

  const removeUserAvatar = React.useCallback(() => {
    setUserAvatar({ type: 'remove' });
  }, [setUserAvatar]);

  const hasCurrentAvatar = !!userInfo?.avatar;
  const actionSheetConfig = React.useMemo(() => {
    const configOptions = [
      { id: 'emoji', onPress: navigateToUserEmojiAvatarCreation },
      { id: 'image', onPress: selectFromGalleryAndUpdateUserAvatar },
      { id: 'camera', onPress: navigateToCamera },
    ];

    if (ensAvatarURI) {
      configOptions.push({ id: 'ens', onPress: setENSUserAvatar });
    }

    if (hasCurrentAvatar) {
      configOptions.push({ id: 'remove', onPress: removeUserAvatar });
    }

    return configOptions;
  }, [
    hasCurrentAvatar,
    ensAvatarURI,
    navigateToCamera,
    navigateToUserEmojiAvatarCreation,
    removeUserAvatar,
    setENSUserAvatar,
    selectFromGalleryAndUpdateUserAvatar,
  ]);

  const showAvatarActionSheet = useShowAvatarActionSheet(actionSheetConfig);

  const styles = useStyles(unboundStyles);

  let spinner;
  if (userAvatarSaveInProgress) {
    spinner = (
      <View style={styles.spinnerContainer}>
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  const { userID } = props;
  const userAvatar = userID ? (
    <UserAvatar userID={userID} size="profile" />
  ) : (
    <UserAvatar userInfo={userInfo} size="profile" />
  );

  const { disabled } = props;
  return (
    <TouchableOpacity onPress={showAvatarActionSheet} disabled={disabled}>
      {userAvatar}
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

export default EditUserAvatar;
