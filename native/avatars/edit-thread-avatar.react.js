// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  extensionFromFilename,
  filenameFromPathOrURI,
} from 'lib/media/file-utils.js';
import type { MediaLibrarySelection } from 'lib/types/media-types.js';

import {
  useProcessSelectedMedia,
  useUploadProcessedMedia,
} from './avatar-hooks.js';
import CommIcon from '../components/comm-icon.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { getCompatibleMediaURI } from '../media/identifier-utils.js';
import { useColors, useStyles } from '../themes/colors.js';

type Props = {
  +children: React.Node,
  +onPressEmojiAvatarFlow: () => mixed,
  +disabled?: boolean,
};
function EditThreadAvatar(props: Props): React.Node {
  const { onPressEmojiAvatarFlow, children, disabled } = props;
  const { showActionSheetWithOptions } = useActionSheet();

  const colors = useColors();
  const styles = useStyles(unboundStyles);

  const uploadProcessedMedia = useUploadProcessedMedia();

  const processSelectedMedia = useProcessSelectedMedia();

  // eslint-disable-next-line no-unused-vars
  const openPhotoGallery = React.useCallback(async () => {
    try {
      const { assets, canceled } = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (canceled || assets.length === 0) {
        return;
      }

      const asset = assets.pop();
      const { width, height, assetId: mediaNativeID } = asset;
      const assetFilename =
        asset.fileName || filenameFromPathOrURI(asset.uri) || '';
      const uri = getCompatibleMediaURI(
        asset.uri,
        extensionFromFilename(assetFilename),
      );

      const currentTime = Date.now();
      const selection: MediaLibrarySelection = {
        step: 'photo_library',
        dimensions: { height, width },
        uri,
        filename: assetFilename,
        mediaNativeID,
        selectTime: currentTime,
        sendTime: currentTime,
        retries: 0,
      };

      const processedMedia = await processSelectedMedia(selection);
      if (!processedMedia.success) {
        return;
      }
      await uploadProcessedMedia(processedMedia);
    } catch (e) {
      console.log(e);
      return;
    }
  }, [processSelectedMedia, uploadProcessedMedia]);

  const editAvatarOptions = React.useMemo(() => {
    const options = [
      {
        id: 'emoji',
        text: 'Use Emoji',
        onPress: onPressEmojiAvatarFlow,
        icon: (
          <CommIcon
            name="emote-smile-filled"
            size={18}
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
  }, [onPressEmojiAvatarFlow, styles.bottomSheetIcon]);

  const insets = useSafeAreaInsets();

  const onPressEditAvatar = React.useCallback(() => {
    const texts = editAvatarOptions.map(option => option.text);

    const cancelButtonIndex = editAvatarOptions.findIndex(
      option => option.isCancel,
    );

    const containerStyle = {
      paddingBottom: insets.bottom,
    };

    const icons = editAvatarOptions.map(option => option.icon);

    const onPressAction = (selectedIndex: ?number) => {
      if (
        selectedIndex === null ||
        selectedIndex === undefined ||
        selectedIndex < 0
      ) {
        return;
      }
      const option = editAvatarOptions[selectedIndex];
      if (option.onPress) {
        option.onPress();
      }
    };

    showActionSheetWithOptions(
      {
        options: texts,
        cancelButtonIndex,
        containerStyle,
        icons,
      },
      onPressAction,
    );
  }, [editAvatarOptions, insets.bottom, showActionSheetWithOptions]);

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
    <TouchableOpacity onPress={onPressEditAvatar} disabled={disabled}>
      {children}
      {editBadge}
    </TouchableOpacity>
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
  bottomSheetIcon: {
    color: '#000000',
  },
};

export default EditThreadAvatar;
