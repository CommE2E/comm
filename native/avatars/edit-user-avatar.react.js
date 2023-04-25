// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import { useENSAvatar } from 'lib/hooks/ens-cache.js';
import { getETHAddressForUserInfo } from 'lib/shared/account-utils.js';

import { useShowAvatarActionSheet } from './avatar-hooks.js';
import EditAvatarBadge from './edit-avatar-badge.react.js';
import { EditUserAvatarContext } from './edit-user-avatar-provider.react.js';
import UserAvatar from './user-avatar.react.js';
import { EmojiUserAvatarCreationRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +userID: ?string,
  +disabled?: boolean,
};
function EditUserAvatar(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { userID, disabled } = props;

  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext should be set');
  const {
    userAvatarSaveInProgress,
    selectFromGalleryAndUpdateUserAvatar,
    setENSUserAvatar,
    removeUserAvatar,
  } = editUserAvatarContext;

  const currentUserInfo = useSelector(state => state.currentUserInfo);
  const ethAddress = React.useMemo(
    () => getETHAddressForUserInfo(currentUserInfo),
    [currentUserInfo],
  );
  const ensAvatarURI = useENSAvatar(ethAddress);

  const { navigate } = useNavigation();
  const navigateToUserEmojiAvatarCreation = React.useCallback(() => {
    navigate(EmojiUserAvatarCreationRouteName);
  }, [navigate]);

  const actionSheetConfig = React.useMemo(() => {
    const configOptions = [
      { id: 'emoji', onPress: navigateToUserEmojiAvatarCreation },
      { id: 'image', onPress: selectFromGalleryAndUpdateUserAvatar },
    ];

    if (ensAvatarURI) {
      configOptions.push({ id: 'ens', onPress: setENSUserAvatar });
    }

    if (currentUserInfo?.avatar) {
      configOptions.push({ id: 'remove', onPress: removeUserAvatar });
    }

    return configOptions;
  }, [
    currentUserInfo?.avatar,
    ensAvatarURI,
    navigateToUserEmojiAvatarCreation,
    removeUserAvatar,
    setENSUserAvatar,
    selectFromGalleryAndUpdateUserAvatar,
  ]);

  const showAvatarActionSheet = useShowAvatarActionSheet(actionSheetConfig);

  let spinner;
  if (userAvatarSaveInProgress) {
    spinner = (
      <View style={styles.spinnerContainer}>
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={showAvatarActionSheet} disabled={disabled}>
      <UserAvatar userID={userID} size="profile" />
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
