// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import { EditUserAvatarContext } from 'lib/components/edit-user-avatar-provider.react.js';
import { useENSAvatar } from 'lib/hooks/ens-cache.js';
import { useFarcasterUserAvatarURL } from 'lib/hooks/fc-cache.js';
import { getETHAddressForUserInfo } from 'lib/shared/account-utils.js';
import type { GenericUserInfoWithAvatar } from 'lib/types/avatar-types.js';

import {
  useNativeSetUserAvatar,
  useSelectFromGalleryAndUpdateUserAvatar,
  useShowAvatarActionSheet,
} from './avatar-hooks.js';
import EditAvatarBadge from './edit-avatar-badge.react.js';
import UserAvatar from './user-avatar.react.js';
import {
  EmojiUserAvatarCreationRouteName,
  UserAvatarCameraModalRouteName,
  EmojiAvatarSelectionRouteName,
  RegistrationUserAvatarCameraModalRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

type Props =
  | { +userID: ?string, +disabled?: boolean, +fid: ?string }
  | {
      +userInfo: ?GenericUserInfoWithAvatar,
      +disabled?: boolean,
      +prefetchedENSAvatarURI: ?string,
      +prefetchedFarcasterAvatarURL: ?string,
      +fid: ?string,
    };
function EditUserAvatar(props: Props): React.Node {
  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');
  const { userAvatarSaveInProgress, getRegistrationModeEnabled } =
    editUserAvatarContext;

  const nativeSetUserAvatar = useNativeSetUserAvatar();

  const selectFromGalleryAndUpdateUserAvatar =
    useSelectFromGalleryAndUpdateUserAvatar();

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const userInfoProp = props.userInfo;
  const userInfo: ?GenericUserInfoWithAvatar = userInfoProp ?? currentUserInfo;

  const ethAddress = React.useMemo(
    () => getETHAddressForUserInfo(userInfo),
    [userInfo],
  );
  const fetchedENSAvatarURI = useENSAvatar(ethAddress);
  const ensAvatarURI = fetchedENSAvatarURI ?? props.prefetchedENSAvatarURI;

  const fid = props.fid;
  const fetchedFarcasterAvatarURL = useFarcasterUserAvatarURL(fid);
  const farcasterAvatarURL =
    fetchedFarcasterAvatarURL ?? props.prefetchedFarcasterAvatarURL;

  const { navigate } = useNavigation();

  const usernameOrEthAddress = userInfo?.username;
  const navigateToEmojiSelection = React.useCallback(() => {
    if (!getRegistrationModeEnabled()) {
      navigate(EmojiUserAvatarCreationRouteName);
      return;
    }
    navigate<'EmojiAvatarSelection'>({
      name: EmojiAvatarSelectionRouteName,
      params: { usernameOrEthAddress },
    });
  }, [navigate, getRegistrationModeEnabled, usernameOrEthAddress]);

  const navigateToCamera = React.useCallback(() => {
    navigate(
      getRegistrationModeEnabled()
        ? RegistrationUserAvatarCameraModalRouteName
        : UserAvatarCameraModalRouteName,
    );
  }, [navigate, getRegistrationModeEnabled]);

  const setENSUserAvatar = React.useCallback(
    () => nativeSetUserAvatar({ type: 'ens' }),
    [nativeSetUserAvatar],
  );

  const setFarcasterUserAvatar = React.useCallback(
    () => nativeSetUserAvatar({ type: 'farcaster' }),
    [nativeSetUserAvatar],
  );

  const removeUserAvatar = React.useCallback(
    () => nativeSetUserAvatar({ type: 'remove' }),
    [nativeSetUserAvatar],
  );

  const hasCurrentAvatar = !!userInfo?.avatar;
  const actionSheetConfig = React.useMemo(() => {
    const configOptions = [
      { id: 'emoji', onPress: navigateToEmojiSelection },
      { id: 'image', onPress: selectFromGalleryAndUpdateUserAvatar },
      { id: 'camera', onPress: navigateToCamera },
    ];

    if (ensAvatarURI) {
      configOptions.push({ id: 'ens', onPress: setENSUserAvatar });
    }

    if (farcasterAvatarURL) {
      configOptions.push({ id: 'farcaster', onPress: setFarcasterUserAvatar });
    }

    if (hasCurrentAvatar) {
      configOptions.push({ id: 'remove', onPress: removeUserAvatar });
    }

    return configOptions;
  }, [
    navigateToEmojiSelection,
    selectFromGalleryAndUpdateUserAvatar,
    navigateToCamera,
    ensAvatarURI,
    farcasterAvatarURL,
    hasCurrentAvatar,
    setENSUserAvatar,
    setFarcasterUserAvatar,
    removeUserAvatar,
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
    <UserAvatar userID={userID} size="XL" />
  ) : (
    <UserAvatar userInfo={userInfo} fid={fid} size="XL" />
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
