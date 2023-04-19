// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import * as ImagePicker from 'expo-image-picker';
import * as React from 'react';
import { Platform } from 'react-native';
import Alert from 'react-native/Libraries/Alert/Alert.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  changeThreadSettings,
  changeThreadSettingsActionTypes,
} from 'lib/actions/thread-actions.js';
import { uploadMultimedia } from 'lib/actions/upload-actions.js';
import {
  updateUserAvatar,
  updateUserAvatarActionTypes,
} from 'lib/actions/user-actions.js';
import {
  extensionFromFilename,
  filenameFromPathOrURI,
} from 'lib/media/file-utils.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  ImageAvatarDBContent,
  UpdateUserAvatarRemoveRequest,
} from 'lib/types/avatar-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type {
  MediaLibrarySelection,
  MediaMissionFailure,
  UploadMultimediaResult,
} from 'lib/types/media-types.js';
import type { UpdateThreadRequest } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import SWMansionIcon from '../components/swmansion-icon.react.js';
import { getCompatibleMediaURI } from '../media/identifier-utils.js';
import type { MediaResult } from '../media/media-utils.js';
import { processMedia } from '../media/media-utils.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

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

function useProcessSelectedMedia(): MediaLibrarySelection => Promise<
  MediaMissionFailure | MediaResult,
> {
  const hasWiFi = useSelector(state => state.connectivity.hasWiFi);
  const staffCanSee = useStaffCanSee();

  const processSelectedMedia = React.useCallback(
    async (selection: MediaLibrarySelection) => {
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

function useSelectFromGallery(): () => Promise<?MediaLibrarySelection> {
  const selectFromGallery = React.useCallback(async () => {
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

      return selection;
    } catch (e) {
      console.log(e);
      return undefined;
    }
  }, []);

  return selectFromGallery;
}

const updateUserAvatarLoadingStatusSelector = createLoadingStatusSelector(
  updateUserAvatarActionTypes,
);
function useSelectFromGalleryAndUpdateUserAvatar(): [
  () => Promise<void>,
  boolean,
] {
  const dispatchActionPromise = useDispatchActionPromise();
  const updateUserAvatarCall = useServerCall(updateUserAvatar);

  const selectFromGallery = useSelectFromGallery();
  const processSelectedMedia = useProcessSelectedMedia();
  const uploadProcessedMedia = useUploadProcessedMedia();

  const [processingOrUploadInProgress, setProcessingOrUploadInProgress] =
    React.useState(false);

  const updateUserAvatarLoadingStatus: LoadingStatus = useSelector(
    updateUserAvatarLoadingStatusSelector,
  );

  const inProgress = React.useMemo(
    () =>
      processingOrUploadInProgress ||
      updateUserAvatarLoadingStatus === 'loading',
    [processingOrUploadInProgress, updateUserAvatarLoadingStatus],
  );

  const selectFromGalleryAndUpdateUserAvatar = React.useCallback(async () => {
    const selection: ?MediaLibrarySelection = await selectFromGallery();
    if (!selection) {
      Alert.alert(
        'Media selection failed',
        'Unable to select media from Media Library.',
      );
      return;
    }

    setProcessingOrUploadInProgress(true);
    let processedMedia;
    try {
      processedMedia = await processSelectedMedia(selection);
    } catch (e) {
      Alert.alert(
        'Media processing failed',
        'Unable to process selected media.',
      );
      setProcessingOrUploadInProgress(false);
      return;
    }

    if (!processedMedia || !processedMedia.success) {
      Alert.alert(
        'Media processing failed',
        'Unable to process selected media.',
      );
      setProcessingOrUploadInProgress(false);
      return;
    }

    let uploadedMedia: ?UploadMultimediaResult;
    try {
      uploadedMedia = await uploadProcessedMedia(processedMedia);
    } catch {
      Alert.alert(
        'Media upload failed',
        'Unable to upload selected media. Please try again.',
      );
      setProcessingOrUploadInProgress(false);
      return;
    }

    if (!uploadedMedia) {
      Alert.alert(
        'Media upload failed',
        'Unable to upload selected media. Please try again.',
      );
      setProcessingOrUploadInProgress(false);
      return;
    }

    const imageAvatarUpdateRequest: ImageAvatarDBContent = {
      type: 'image',
      uploadID: uploadedMedia.id,
    };

    dispatchActionPromise(
      updateUserAvatarActionTypes,
      updateUserAvatarCall(imageAvatarUpdateRequest),
    );
    setProcessingOrUploadInProgress(false);
  }, [
    dispatchActionPromise,
    processSelectedMedia,
    selectFromGallery,
    updateUserAvatarCall,
    uploadProcessedMedia,
  ]);

  return React.useMemo(
    () => [selectFromGalleryAndUpdateUserAvatar, inProgress],
    [selectFromGalleryAndUpdateUserAvatar, inProgress],
  );
}

function useSelectFromGalleryAndUpdateThreadAvatar(
  threadID: string,
): () => Promise<void> {
  const dispatchActionPromise = useDispatchActionPromise();
  const changeThreadSettingsCall = useServerCall(changeThreadSettings);

  const selectFromGallery = useSelectFromGallery();
  const processSelectedMedia = useProcessSelectedMedia();
  const uploadProcessedMedia = useUploadProcessedMedia();

  const selectFromGalleryAndUpdateThreadAvatar = React.useCallback(async () => {
    const selection: ?MediaLibrarySelection = await selectFromGallery();
    if (!selection) {
      console.log('MEDIA_SELECTION_FAILED');
      return;
    }

    const processedMedia = await processSelectedMedia(selection);
    if (!processedMedia.success) {
      console.log('MEDIA_PROCESSING_FAILED');
      // TODO (atul): Clean up any temporary files.
      return;
    }

    let uploadedMedia: ?UploadMultimediaResult;
    try {
      uploadedMedia = await uploadProcessedMedia(processedMedia);
      // TODO (atul): Clean up any temporary files.
    } catch {
      console.log('MEDIA_UPLOAD_FAILED');
      // TODO (atul): Clean up any temporary files.
      return;
    }

    if (!uploadedMedia) {
      console.log('MEDIA_UPLOAD_FAILED');
      // TODO (atul): Clean up any temporary files.
      return;
    }

    const imageAvatarUpdateRequest: ImageAvatarDBContent = {
      type: 'image',
      uploadID: uploadedMedia.id,
    };

    const updateThreadRequest: UpdateThreadRequest = {
      threadID,
      changes: {
        avatar: imageAvatarUpdateRequest,
      },
    };

    dispatchActionPromise(
      changeThreadSettingsActionTypes,
      changeThreadSettingsCall(updateThreadRequest),
      { customKeyName: `${changeThreadSettingsActionTypes.started}:avatar` },
    );
  }, [
    changeThreadSettingsCall,
    dispatchActionPromise,
    processSelectedMedia,
    selectFromGallery,
    threadID,
    uploadProcessedMedia,
  ]);

  return selectFromGalleryAndUpdateThreadAvatar;
}

function useRemoveUserAvatar(): [() => Promise<void>, boolean] {
  const dispatchActionPromise = useDispatchActionPromise();
  const updateUserAvatarCall = useServerCall(updateUserAvatar);
  const updateUserAvatarLoadingStatus: LoadingStatus = useSelector(
    updateUserAvatarLoadingStatusSelector,
  );

  const removeUserAvatar = React.useCallback(async () => {
    const removeAvatarRequest: UpdateUserAvatarRemoveRequest = {
      type: 'remove',
    };

    dispatchActionPromise(
      updateUserAvatarActionTypes,
      updateUserAvatarCall(removeAvatarRequest),
    );
  }, [dispatchActionPromise, updateUserAvatarCall]);

  return React.useMemo(
    () => [removeUserAvatar, updateUserAvatarLoadingStatus === 'loading'],
    [removeUserAvatar, updateUserAvatarLoadingStatus],
  );
}

function useRemoveThreadAvatar(threadID: string): () => Promise<void> {
  const dispatchActionPromise = useDispatchActionPromise();
  const changeThreadSettingsCall = useServerCall(changeThreadSettings);

  const removeThreadAvatar = React.useCallback(async () => {
    const removeAvatarRequest: UpdateUserAvatarRemoveRequest = {
      type: 'remove',
    };

    const updateThreadRequest: UpdateThreadRequest = {
      threadID,
      changes: {
        avatar: removeAvatarRequest,
      },
    };
    dispatchActionPromise(
      changeThreadSettingsActionTypes,
      changeThreadSettingsCall(updateThreadRequest),
    );
  }, [changeThreadSettingsCall, dispatchActionPromise, threadID]);

  return removeThreadAvatar;
}

type ShowAvatarActionSheetOptions = {
  +id: 'emoji' | 'image' | 'cancel' | 'remove',
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
        return 'Use Emoji';
      } else if (option.id === 'image') {
        return 'Select image';
      } else if (option.id === 'remove') {
        return 'Remove avatar';
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
  useUploadProcessedMedia,
  useProcessSelectedMedia,
  useShowAvatarActionSheet,
  useSelectFromGalleryAndUpdateUserAvatar,
  useSelectFromGalleryAndUpdateThreadAvatar,
  useRemoveUserAvatar,
  useRemoveThreadAvatar,
};
