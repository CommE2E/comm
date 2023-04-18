// @flow

import * as React from 'react';
import { TouchableOpacity, Platform } from 'react-native';

import {
  useSelectAndUploadFromGallery,
  useShowAvatarActionSheet,
} from './avatar-hooks.js';
import EditAvatarBadge from './edit-avatar-badge.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +children: React.Node,
  +onPressEmojiAvatarFlow: () => mixed,
  +disabled?: boolean,
};
function EditUserAvatar(props: Props): React.Node {
  const { onPressEmojiAvatarFlow, children, disabled } = props;

  const styles = useStyles(unboundStyles);

  const selectAndUploadFromGallery = useSelectAndUploadFromGallery();

  const editAvatarOptions = React.useMemo(() => {
    const options = [
      {
        id: 'emoji',
        text: 'Use Emoji',
        onPress: onPressEmojiAvatarFlow,
        icon: (
          <SWMansionIcon
            name="emote-smile"
            size={22}
            style={styles.bottomSheetIcon}
          />
        ),
      },
      {
        id: 'image',
        text: 'Select image',
        onPress: selectAndUploadFromGallery,
        icon: (
          <SWMansionIcon
            name="image-1"
            size={22}
            style={styles.bottomSheetIcon}
          />
        ),
      },
    ];

    if (Platform.OS === 'ios') {
      options.push({
        id: 'cancel',
        text: 'Cancel',
        isCancel: true,
      });
    }
    return options;
  }, [
    onPressEmojiAvatarFlow,
    selectAndUploadFromGallery,
    styles.bottomSheetIcon,
  ]);

  const showAvatarActionSheet = useShowAvatarActionSheet(editAvatarOptions);

  let editBadge;
  if (!disabled) {
    editBadge = <EditAvatarBadge />;
  }

  return (
    <TouchableOpacity onPress={showAvatarActionSheet} disabled={disabled}>
      {children}
      {editBadge}
    </TouchableOpacity>
  );
}

const unboundStyles = {
  bottomSheetIcon: {
    color: '#000000',
  },
};

export default EditUserAvatar;
