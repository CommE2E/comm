// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as React from 'react';
import { View, TouchableWithoutFeedback } from 'react-native';

import {
  extensionFromFilename,
  filenameFromPathOrURI,
} from 'lib/media/file-utils.js';
import type { MediaLibrarySelection } from 'lib/types/media-types.js';

import SWMansionIcon from '../components/swmansion-icon.react.js';
import { getCompatibleMediaURI } from '../media/identifier-utils.js';
import { useColors, useStyles } from '../themes/colors.js';

type Props = {
  +children: React.Node,
  +onPressEmojiAvatarFlow: () => mixed,
  +disabled?: boolean,
};
function EditAvatar(props: Props): React.Node {
  const { onPressEmojiAvatarFlow, children, disabled } = props;

  const { showActionSheetWithOptions } = useActionSheet();

  const colors = useColors();
  const styles = useStyles(unboundStyles);

  const onPressAvatarPhotoGalleryFlow = React.useCallback(async () => {
    try {
      const { assets, canceled } = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        // maximum quality is 1 - it disables compression
        quality: 1,
      });

      if (canceled || assets.length === 0) {
        return;
      }

      const selections: $ReadOnlyArray<MediaLibrarySelection> = assets.map(
        asset => {
          const { width, height, fileName, assetId: mediaNativeID } = asset;
          const filename = fileName || filenameFromPathOrURI(asset.uri) || '';
          const uri = getCompatibleMediaURI(
            asset.uri,
            extensionFromFilename(filename),
          );

          return {
            step: 'photo_library',
            dimensions: { height, width },
            uri,
            filename,
            mediaNativeID,
            selectTime: 0,
            sendTime: 0,
            retries: 0,
          };
        },
      );

      console.log(selections);
    } catch (e) {
      if (__DEV__) {
        console.warn(e);
      }
    }
  }, []);

  const onPressEditAvatar = React.useCallback(() => {
    const actionSheetOptions = [
      {
        id: 'emoji',
        text: 'Use Emoji',
        onPress: onPressEmojiAvatarFlow,
      },
      {
        id: 'gallery',
        text: 'Photo Gallery',
        onPress: onPressAvatarPhotoGalleryFlow,
      },
    ];

    const onPressAction = (selectedIndex: ?number) => {
      const index = selectedIndex ?? 0;
      actionSheetOptions[index].onPress();
    };

    const texts = actionSheetOptions.map(option => option.text);

    showActionSheetWithOptions(
      {
        options: texts,
      },
      onPressAction,
    );
  }, [
    onPressAvatarPhotoGalleryFlow,
    onPressEmojiAvatarFlow,
    showActionSheetWithOptions,
  ]);

  const editBadge = React.useMemo(() => {
    if (disabled) {
      return null;
    }

    return (
      <View style={styles.editAvatarIconContainer}>
        <SWMansionIcon
          name="edit-2"
          size={16}
          style={styles.editAvatarIcon}
          color={colors.floatingButtonLabel}
        />
      </View>
    );
  }, [
    colors.floatingButtonLabel,
    disabled,
    styles.editAvatarIcon,
    styles.editAvatarIconContainer,
  ]);

  return (
    <TouchableWithoutFeedback onPress={onPressEditAvatar} disabled={disabled}>
      <View>
        {children}
        {editBadge}
      </View>
    </TouchableWithoutFeedback>
  );
}

const unboundStyles = {
  editAvatarIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: 'panelForeground',
    borderRadius: 18,
    width: 36,
    height: 36,
    backgroundColor: 'purpleButton',
    justifyContent: 'center',
  },
  editAvatarIcon: {
    textAlign: 'center',
  },
};

export default EditAvatar;
