// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import * as ImagePicker from 'expo-image-picker';
import invariant from 'invariant';
import * as React from 'react';
import { Platform } from 'react-native';
import filesystem from 'react-native-fs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  uploadMultimedia,
  useBlobServiceUpload,
} from 'lib/actions/upload-actions.js';
import { EditThreadAvatarContext } from 'lib/components/base-edit-thread-avatar-provider.react.js';
import { EditUserAvatarContext } from 'lib/components/edit-user-avatar-provider.react.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import {
  extensionFromFilename,
  filenameFromPathOrURI,
} from 'lib/media/file-utils.js';
import type { UpdateUserAvatarRequest } from 'lib/types/avatar-types.js';
import type {
  NativeMediaSelection,
  MediaLibrarySelection,
  MediaMissionFailure,
} from 'lib/types/media-types.js';
import type {
  RawThreadInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypeIsThick } from 'lib/types/thread-types-enum.js';

import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import CommIcon from '../components/comm-icon.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { encryptMedia } from '../media/encryption-utils.js';
import { getCompatibleMediaURI } from '../media/identifier-utils.js';
import type { MediaResult } from '../media/media-utils.js';
import { processMedia } from '../media/media-utils.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';
import blobServiceUploadHandler from '../utils/blob-service-upload.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

const useBlobServiceUploads = true;

function displayAvatarUpdateFailureAlert(): void {
  Alert.alert(
    'Couldn’t save avatar',
    'Please try again later',
    [{ text: 'OK' }],
    { cancelable: true },
  );
}

function useUploadProcessedMedia(): (
  media: MediaResult,
  metadataUploadLocation: 'keyserver' | 'none',
) => Promise<?UpdateUserAvatarRequest> {
  const callUploadMultimedia = useLegacyAshoatKeyserverCall(uploadMultimedia);
  const callBlobServiceUpload = useBlobServiceUpload();
  return React.useCallback(
    async (processedMedia, metadataUploadLocation) => {
      const useBlobService =
        metadataUploadLocation !== 'keyserver' || useBlobServiceUploads;
      if (!useBlobService) {
        const { uploadURI, filename, mime, dimensions } = processedMedia;
        const { id } = await callUploadMultimedia(
          {
            uri: uploadURI,
            name: filename,
            type: mime,
          },
          dimensions,
        );
        if (!id) {
          return undefined;
        }
        return { type: 'image', uploadID: id };
      }

      const { result: encryptionResult } = await encryptMedia(processedMedia);
      if (!encryptionResult.success) {
        throw new Error('Avatar media encryption failed.');
      }

      invariant(
        encryptionResult.mediaType === 'encrypted_photo',
        'Invalid mediaType after encrypting avatar',
      );
      const {
        uploadURI,
        filename,
        mime,
        blobHash,
        encryptionKey,
        dimensions,
        thumbHash,
      } = encryptionResult;
      const { id, uri } = await callBlobServiceUpload({
        uploadInput: {
          blobInput: {
            type: 'uri',
            uri: uploadURI,
            filename,
            mimeType: mime,
          },
          blobHash,
          encryptionKey,
          dimensions,
          thumbHash,
          loop: false,
        },
        keyserverOrThreadID:
          metadataUploadLocation === 'keyserver'
            ? authoritativeKeyserverID
            : null,
        callbacks: { blobServiceUploadHandler },
      });
      if (metadataUploadLocation !== 'keyserver') {
        return {
          type: 'non_keyserver_image',
          blobURI: uri,
          thumbHash,
          encryptionKey,
        };
      }
      if (!id) {
        return undefined;
      }
      return { type: 'encrypted_image', uploadID: id };
    },
    [callUploadMultimedia, callBlobServiceUpload],
  );
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
): (
  selection: NativeMediaSelection,
  metadataUploadLocation: 'keyserver' | 'none',
) => Promise<?UpdateUserAvatarRequest> {
  const processSelectedMedia = useProcessSelectedMedia();
  const uploadProcessedMedia = useUploadProcessedMedia();

  return React.useCallback(
    async (selection: NativeMediaSelection, metadataUploadLocation) => {
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

      let uploadedMedia: ?UpdateUserAvatarRequest;
      try {
        uploadedMedia = await uploadProcessedMedia(
          processedMedia,
          metadataUploadLocation,
        );
        urisToBeDisposed.forEach(filesystem.unlink);
        setProcessingOrUploadInProgress?.(false);
      } catch {
        urisToBeDisposed.forEach(filesystem.unlink);
        Alert.alert(
          'Media upload failed',
          'Unable to upload selected media. Please try again.',
        );
        setProcessingOrUploadInProgress?.(false);
        return undefined;
      }

      return uploadedMedia;
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

      const imageAvatarUpdateRequest = await uploadSelectedMedia(
        selection,
        'keyserver',
      );
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

function useNativeSetThreadAvatar(): (
  threadID: string,
  avatarRequest: UpdateUserAvatarRequest,
) => Promise<void> {
  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext must be defined');
  const { baseSetThreadAvatar } = editThreadAvatarContext;

  const nativeSetThreadAvatar = React.useCallback(
    async (
      threadID: string,
      avatarRequest: UpdateUserAvatarRequest,
    ): Promise<void> => {
      try {
        await baseSetThreadAvatar(threadID, avatarRequest);
      } catch (e) {
        displayAvatarUpdateFailureAlert();
        throw e;
      }
    },
    [baseSetThreadAvatar],
  );

  return nativeSetThreadAvatar;
}

function useNativeUpdateThreadImageAvatar(): (
  selection: NativeMediaSelection,
  threadInfo: ThreadInfo | RawThreadInfo,
) => Promise<void> {
  const editThreadAvatarContext = React.useContext(EditThreadAvatarContext);
  invariant(editThreadAvatarContext, 'editThreadAvatarContext must be defined');
  const { baseSetThreadAvatar, updateThreadAvatarMediaUploadInProgress } =
    editThreadAvatarContext;

  const uploadSelectedMedia = useUploadSelectedMedia(
    updateThreadAvatarMediaUploadInProgress,
  );

  const nativeUpdateThreadImageAvatar = React.useCallback(
    async (
      selection: NativeMediaSelection,
      threadInfo: ThreadInfo | RawThreadInfo,
    ): Promise<void> => {
      const metadataUploadLocation = threadTypeIsThick(threadInfo.type)
        ? 'none'
        : 'keyserver';
      const imageAvatarUpdateRequest = await uploadSelectedMedia(
        selection,
        metadataUploadLocation,
      );
      if (!imageAvatarUpdateRequest) {
        return;
      }

      try {
        await baseSetThreadAvatar(threadInfo.id, imageAvatarUpdateRequest);
      } catch {
        displayAvatarUpdateFailureAlert();
      }
    },
    [baseSetThreadAvatar, uploadSelectedMedia],
  );

  return nativeUpdateThreadImageAvatar;
}

function useSelectFromGalleryAndUpdateThreadAvatar(): (
  threadInfo: ThreadInfo | RawThreadInfo,
) => Promise<void> {
  const nativeUpdateThreadImageAvatar = useNativeUpdateThreadImageAvatar();

  const selectFromGalleryAndUpdateThreadAvatar = React.useCallback(
    async (threadInfo: ThreadInfo | RawThreadInfo): Promise<void> => {
      const selection: ?MediaLibrarySelection = await selectFromGallery();
      if (!selection) {
        return;
      }
      await nativeUpdateThreadImageAvatar(selection, threadInfo);
    },
    [nativeUpdateThreadImageAvatar],
  );

  return selectFromGalleryAndUpdateThreadAvatar;
}

type ShowAvatarActionSheetOptions = {
  +id: 'emoji' | 'image' | 'camera' | 'ens' | 'farcaster' | 'cancel' | 'remove',
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
      } else if (option.id === 'farcaster') {
        return 'Use Farcaster avatar';
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
      paddingBottom: insets.bottom,
    };

    const icons = options.map(option => {
      if (option.id === 'emoji') {
        return (
          <SWMansionIcon
            name="emote-smile"
            key={option.id}
            size={22}
            style={styles.bottomSheetIcon}
          />
        );
      } else if (option.id === 'image') {
        return (
          <SWMansionIcon
            name="image-1"
            key={option.id}
            size={22}
            style={styles.bottomSheetIcon}
          />
        );
      } else if (option.id === 'camera') {
        return (
          <SWMansionIcon
            name="camera"
            key={option.id}
            size={22}
            style={styles.bottomSheetIcon}
          />
        );
      } else if (option.id === 'ens') {
        return (
          <CommIcon
            name="ethereum-outline"
            key={option.id}
            size={22}
            style={styles.bottomSheetIcon}
          />
        );
      } else if (option.id === 'farcaster') {
        return (
          <CommIcon
            name="farcaster-outline"
            key={option.id}
            size={22}
            style={styles.bottomSheetIcon}
          />
        );
      } else if (option.id === 'remove') {
        return (
          <SWMansionIcon
            name="trash-2"
            key={option.id}
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
  useNativeSetThreadAvatar,
  useNativeUpdateThreadImageAvatar,
};
