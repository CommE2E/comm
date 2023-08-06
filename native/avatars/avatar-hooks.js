// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import * as ImagePicker from 'expo-image-picker';
import invariant from 'invariant';
import * as React from 'react';
import { Platform } from 'react-native';
import filesystem from 'react-native-fs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { uploadMultimedia } from 'lib/actions/upload-actions.js';
import { EditThreadAvatarContext } from 'lib/components/base-edit-thread-avatar-provider.react.js';
import { EditUserAvatarContext } from 'lib/components/edit-user-avatar-provider.react.js';
import {
  extensionFromFilename,
  filenameFromPathOrURI,
} from 'lib/media/file-utils.js';
import type {
  ImageAvatarDBContent,
  UpdateUserAvatarRequest,
} from 'lib/types/avatar-types.js';
import type {
  NativeMediaSelection,
  MediaLibrarySelection,
  MediaMissionFailure,
  UploadMultimediaResult,
} from 'lib/types/media-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import CommIcon from '../components/comm-icon.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { getCompatibleMediaURI } from '../media/identifier-utils.js';
import type { MediaResult } from '../media/media-utils.js';
import { processMedia } from '../media/media-utils.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

function displayAvatarUpdateFailureAlert(): void {
  Alert.alert(
    'Couldn’t save avatar',
    'Please try again later',
    [{ text: 'OK' }],
    { cancelable: true },
  );
}

function useUploadProcessedMedia(): MediaResult => Promise<UploadMultimediaResult> {
  const callUploadMultimedia = useServerCall(uploadMultimedia);
  const uploadProcessedMultimedia: MediaResult => Promise<UploadMultimediaResult> =
    React.useCallback(
      processedMedia => {
        const { uploadURI, filename, mime, dimensions } = processedMedia;
        return callUploadMultimedia(
          {
            uri: uploadURI,
            name: filename,
            type: mime,
          },
          dimensions,
        );
      },
      [callUploadMultimedia],
    );
  return uploadProcessedMultimedia;
}

function useProcessSelectedMedia(): NativeMediaSelection => Promise<
  MediaMissionFailure | MediaResult,
> {
  const hasWiFi = useSelector(state => state.connectivity.hasWiFi);
  const staffCanSee = useStaffCanSee();

  const processSelectedMedia = React.useCallback(
    async (selection: NativeMediaSelection) => {
      const { resultPromise } = processMedia(selection, {
        hasWiFi,
        finalFileHeaderCheck: staffCanSee,
      });

      return await resultPromise;
    },
    [hasWiFi, staffCanSee],
  );

  return processSelectedMedia;
}

async function selectFromGallery(): Promise<?MediaLibrarySelection> {
  try {
    const { assets, canceled } = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (canceled || assets.length === 0) {
      return undefined;
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

    return selection;
  } catch (e) {
    console.log(e);
    return undefined;
  }
}

function useUploadSelectedMedia(
  setProcessingOrUploadInProgress?: (inProgress: boolean) => mixed,
): (selection: NativeMediaSelection) => Promise<?ImageAvatarDBContent> {
  const processSelectedMedia = useProcessSelectedMedia();
  const uploadProcessedMedia = useUploadProcessedMedia();

  return React.useCallback(
    async (selection: NativeMediaSelection) => {
      setProcessingOrUploadInProgress?.(true);
      const urisToBeDisposed: Set<string> = new Set([selection.uri]);

      let processedMedia;
      try {
        processedMedia = await processSelectedMedia(selection);
        if (processedMedia.uploadURI) {
          urisToBeDisposed.add(processedMedia.uploadURI);
        }
      } catch (e) {
        urisToBeDisposed.forEach(filesystem.unlink);
        Alert.alert(
          'Media processing failed',
          'Unable to process selected media.',
        );
        setProcessingOrUploadInProgress?.(false);
        return undefined;
      }

      if (!processedMedia.success) {
        urisToBeDisposed.forEach(filesystem.unlink);
        Alert.alert(
          'Media processing failed',
          'Unable to process selected media.',
        );
        setProcessingOrUploadInProgress?.(false);
        return undefined;
      }

      let uploadedMedia: UploadMultimediaResult;
      try {
        uploadedMedia = await uploadProcessedMedia(processedMedia);
        urisToBeDisposed.forEach(filesystem.unlink);
      } catch {
        urisToBeDisposed.forEach(filesystem.unlink);
        Alert.alert(
          'Media upload failed',
          'Unable to upload selected media. Please try again.',
        );
        setProcessingOrUploadInProgress?.(false);
        return undefined;
      }

      if (!uploadedMedia.id) {
        return undefined;
      }

      return {
        type: 'image',
        uploadID: uploadedMedia.id,
      };
    },
    [
      processSelectedMedia,
      setProcessingOrUploadInProgress,
      uploadProcessedMedia,
    ],
  );
}

function useNativeSetUserAvatar(): (
  request: UpdateUserAvatarRequest,
) => Promise<void> {
  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext must be defined');
  const {
    baseSetUserAvatar,
    getRegistrationModeEnabled,
    getRegistrationModeSuccessCallback,
  } = editUserAvatarContext;

  const nativeSetUserAvatar = React.useCallback(
    async (request: UpdateUserAvatarRequest) => {
      const registrationModeEnabled = getRegistrationModeEnabled();
      if (registrationModeEnabled) {
        const successCallback = getRegistrationModeSuccessCallback();
        invariant(
          successCallback,
          'successCallback must be defined if registrationModeEnabled is true',
        );
        successCallback({
          needsUpload: false,
          updateUserAvatarRequest: request,
        });
        return;
      }

      try {
        await baseSetUserAvatar(request);
      } catch {
        displayAvatarUpdateFailureAlert();
      }
    },
    [
      getRegistrationModeEnabled,
      getRegistrationModeSuccessCallback,
      baseSetUserAvatar,
    ],
  );

  return nativeSetUserAvatar;
}

function useNativeUpdateUserImageAvatar(): (
  selection: NativeMediaSelection,
) => Promise<void> {
  const editUserAvatarContext = React.useContext(EditUserAvatarContext);
  invariant(editUserAvatarContext, 'editUserAvatarContext must be defined');
  const {
    baseSetUserAvatar,
    getRegistrationModeEnabled,
    getRegistrationModeSuccessCallback,
    setUserAvatarMediaUploadInProgress,
  } = editUserAvatarContext;

  const uploadSelectedMedia = useUploadSelectedMedia(
    setUserAvatarMediaUploadInProgress,
  );

  const nativeUpdateUserImageAvatar = React.useCallback(
    async (selection: NativeMediaSelection) => {
      const registrationModeEnabled = getRegistrationModeEnabled();
      if (registrationModeEnabled) {
        const successCallback = getRegistrationModeSuccessCallback();
        invariant(
          successCallback,
          'successCallback must be defined if registrationModeEnabled is true',
        );
        successCallback({
          needsUpload: true,
          mediaSelection: selection,
        });
        return;
      }

      const imageAvatarUpdateRequest = await uploadSelectedMedia(selection);
      if (!imageAvatarUpdateRequest) {
        return;
      }

      try {
        await baseSetUserAvatar(imageAvatarUpdateRequest);
      } catch {
        displayAvatarUpdateFailureAlert();
      }
    },
    [
      getRegistrationModeEnabled,
      getRegistrationModeSuccessCallback,
      baseSetUserAvatar,
      uploadSelectedMedia,
    ],
  );

  return nativeUpdateUserImageAvatar;
}

function useSelectFromGalleryAndUpdateUserAvatar(): () => Promise<void> {
  const nativeUpdateUserImageAvatar = useNativeUpdateUserImageAvatar();

  const selectFromGalleryAndUpdateUserAvatar =
    React.useCallback(async (): Promise<void> => {
      const selection = await selectFromGallery();
      if (!selection) {
        return;
      }
      await nativeUpdateUserImageAvatar(selection);
    }, [nativeUpdateUserImageAvatar]);

  return selectFromGalleryAndUpdateUserAvatar;
}

function useNativeUpdateThreadImageAvatar(): (
  selection: NativeMediaSelection,
  threadID: string,
) => Promise<void> {
  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext must be defined');
  const { updateImageThreadAvatar } = editThreadAvatarContext;

  const nativeUpdateThreadImageAvatar = React.useCallback(
    async (
      selection: NativeMediaSelection,
      threadID: string,
    ): Promise<void> => {
      try {
        await updateImageThreadAvatar(selection, threadID);
      } catch {
        displayAvatarUpdateFailureAlert();
      }
    },
    [updateImageThreadAvatar],
  );

  return nativeUpdateThreadImageAvatar;
}

function useSelectFromGalleryAndUpdateThreadAvatar(): (
  threadID: string,
) => Promise<void> {
  const nativeUpdateThreadImageAvatar = useNativeUpdateThreadImageAvatar();

  const selectFromGalleryAndUpdateThreadAvatar = React.useCallback(
    async (threadID: string): Promise<void> => {
      const selection: ?MediaLibrarySelection = await selectFromGallery();
      if (!selection) {
        return;
      }
      await nativeUpdateThreadImageAvatar(selection, threadID);
    },
    [nativeUpdateThreadImageAvatar],
  );

  return selectFromGalleryAndUpdateThreadAvatar;
}

type ShowAvatarActionSheetOptions = {
  +id: 'emoji' | 'image' | 'camera' | 'ens' | 'cancel' | 'remove',
  +onPress?: () => mixed,
};
function useShowAvatarActionSheet(
  options: $ReadOnlyArray<ShowAvatarActionSheetOptions>,
): () => void {
  options = Platform.OS === 'ios' ? [...options, { id: 'cancel' }] : options;

  const insets = useSafeAreaInsets();
  const { showActionSheetWithOptions } = useActionSheet();
  const styles = useStyles(unboundStyles);

  const showAvatarActionSheet = React.useCallback(() => {
    const texts = options.map((option: ShowAvatarActionSheetOptions) => {
      if (option.id === 'emoji') {
        return 'Select emoji';
      } else if (option.id === 'image') {
        return 'Select image';
      } else if (option.id === 'camera') {
        return 'Open camera';
      } else if (option.id === 'ens') {
        return 'Use ENS avatar';
      } else if (option.id === 'remove') {
        return 'Reset to default';
      } else {
        return 'Cancel';
      }
    });

    const cancelButtonIndex = options.findIndex(
      option => option.id === 'cancel',
    );

    const containerStyle = {
      paddingBotton: insets.bottom,
    };

    const icons = options.map(option => {
      if (option.id === 'emoji') {
        return (
          <SWMansionIcon
            name="emote-smile"
            size={22}
            style={styles.bottomSheetIcon}
          />
        );
      } else if (option.id === 'image') {
        return (
          <SWMansionIcon
            name="image-1"
            size={22}
            style={styles.bottomSheetIcon}
          />
        );
      } else if (option.id === 'camera') {
        return (
          <SWMansionIcon
            name="camera"
            size={22}
            style={styles.bottomSheetIcon}
          />
        );
      } else if (option.id === 'ens') {
        return (
          <CommIcon
            name="ethereum-outline"
            size={18}
            style={styles.bottomSheetIcon}
          />
        );
      } else if (option.id === 'remove') {
        return (
          <SWMansionIcon
            name="trash-2"
            size={22}
            style={styles.bottomSheetIcon}
          />
        );
      } else {
        return undefined;
      }
    });

    const onPressAction = (selectedIndex: ?number) => {
      if (
        selectedIndex === null ||
        selectedIndex === undefined ||
        selectedIndex < 0
      ) {
        return;
      }
      const option = options[selectedIndex];
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
  }, [
    insets.bottom,
    options,
    showActionSheetWithOptions,
    styles.bottomSheetIcon,
  ]);

  return showAvatarActionSheet;
}

const unboundStyles = {
  bottomSheetIcon: {
    color: '#000000',
  },
};

export {
  displayAvatarUpdateFailureAlert,
  selectFromGallery,
  useUploadSelectedMedia,
  useUploadProcessedMedia,
  useProcessSelectedMedia,
  useShowAvatarActionSheet,
  useSelectFromGalleryAndUpdateUserAvatar,
  useNativeSetUserAvatar,
  useNativeUpdateUserImageAvatar,
  useSelectFromGalleryAndUpdateThreadAvatar,
  useNativeUpdateThreadImageAvatar,
};
