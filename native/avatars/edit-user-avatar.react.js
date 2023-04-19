// @flow

import * as React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

import {
  useRemoveUserAvatar,
  useSelectFromGalleryAndUpdateUserAvatar,
  useShowAvatarActionSheet,
} from './avatar-hooks.js';
import EditAvatarBadge from './edit-avatar-badge.react.js';
import UserAvatar from './user-avatar.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +userID: ?string,
  +onPressEmojiAvatarFlow: () => mixed,
  +disabled?: boolean,
};
function EditUserAvatar(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { userID, onPressEmojiAvatarFlow, disabled } = props;

  const [selectFromGalleryAndUpdateUserAvatar, isGalleryAvatarUpdateLoading] =
    useSelectFromGalleryAndUpdateUserAvatar();

  const [removeUserAvatar, isRemoveAvatarUpdateLoading] = useRemoveUserAvatar();

  const isAvatarUpdateInProgress =
    isGalleryAvatarUpdateLoading || isRemoveAvatarUpdateLoading;

  const actionSheetConfig = React.useMemo(
    () => [
      { id: 'emoji', onPress: onPressEmojiAvatarFlow },
      { id: 'image', onPress: selectFromGalleryAndUpdateUserAvatar },
      { id: 'remove', onPress: removeUserAvatar },
    ],
    [
      onPressEmojiAvatarFlow,
      removeUserAvatar,
      selectFromGalleryAndUpdateUserAvatar,
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
