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
  extensionFromFilename,
  filenameFromPathOrURI,
} from 'lib/media/file-utils.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  ImageAvatarDBContent,
  UpdateUserAvatarRemoveRequest,
} from 'lib/types/avatar-types.js';
import type { SetState } from 'lib/types/hook-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type {
  NativeMediaSelection,
  MediaLibrarySelection,
  MediaMissionFailure,
  UploadMultimediaResult,
} from 'lib/types/media-types.js';
import type { UpdateThreadRequest } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import CommIcon from '../components/comm-icon.react.js';
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
  setProcessingOrUploadInProgress: SetState<boolean>,
): (selection: ?NativeMediaSelection) => Promise<?ImageAvatarDBContent> {
  const processSelectedMedia = useProcessSelectedMedia();
  const uploadProcessedMedia = useUploadProcessedMedia();

  return React.useCallback(
    async (selection: ?NativeMediaSelection) => {
      if (!selection) {
        Alert.alert(
          'Media selection failed',
          'Unable to select media from Media Library.',
        );
        return undefined;
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
        return undefined;
      }

      if (!processedMedia.success) {
        Alert.alert(
          'Media processing failed',
          'Unable to process selected media.',
        );
        setProcessingOrUploadInProgress(false);
        return undefined;
      }

      let uploadedMedia: UploadMultimediaResult;
      try {
        uploadedMedia = await uploadProcessedMedia(processedMedia);
      } catch {
        Alert.alert(
          'Media upload failed',
          'Unable to upload selected media. Please try again.',
        );
        setProcessingOrUploadInProgress(false);
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

const threadAvatarLoadingStatusSelector = createLoadingStatusSelector(
  changeThreadSettingsActionTypes,
  `${changeThreadSettingsActionTypes.started}:avatar`,
);
function useSelectFromGalleryAndUpdateThreadAvatar(
  threadID: string,
): [() => Promise<void>, boolean] {
  const dispatchActionPromise = useDispatchActionPromise();
  const changeThreadSettingsCall = useServerCall(changeThreadSettings);

  const [processingOrUploadInProgress, setProcessingOrUploadInProgress] =
    React.useState(false);

  const updateThreadAvatarLoadingStatus: LoadingStatus = useSelector(
    threadAvatarLoadingStatusSelector,
  );

  const inProgress = React.useMemo(
    () =>
      processingOrUploadInProgress ||
      updateThreadAvatarLoadingStatus === 'loading',
    [processingOrUploadInProgress, updateThreadAvatarLoadingStatus],
  );

  const uploadSelectedMedia = useUploadSelectedMedia(
    setProcessingOrUploadInProgress,
  );

  const selectFromGalleryAndUpdateThreadAvatar = React.useCallback(async () => {
    const selection: ?MediaLibrarySelection = await selectFromGallery();

    const imageAvatarUpdateRequest = await uploadSelectedMedia(selection);

    if (!imageAvatarUpdateRequest) {
      return;
    }

    const updateThreadRequest: UpdateThreadRequest = {
      threadID,
      changes: {
        avatar: imageAvatarUpdateRequest,
      },
    };

    dispatchActionPromise(
      changeThreadSettingsActionTypes,
      (async () => {
        setProcessingOrUploadInProgress(false);
        try {
          return await changeThreadSettingsCall(updateThreadRequest);
        } catch (e) {
          Alert.alert('Avatar update failed', 'Unable to update avatar.');
          throw e;
        }
      })(),
      { customKeyName: `${changeThreadSettingsActionTypes.started}:avatar` },
    );
  }, [
    changeThreadSettingsCall,
    dispatchActionPromise,
    threadID,
    uploadSelectedMedia,
  ]);

  return React.useMemo(
    () => [selectFromGalleryAndUpdateThreadAvatar, inProgress],
    [inProgress, selectFromGalleryAndUpdateThreadAvatar],
  );
}

function useRemoveThreadAvatar(threadID: string): [() => void, boolean] {
  const dispatchActionPromise = useDispatchActionPromise();
  const changeThreadSettingsCall = useServerCall(changeThreadSettings);
  const updateThreadAvatarLoadingStatus: LoadingStatus = useSelector(
    threadAvatarLoadingStatusSelector,
  );

  const removeThreadAvatar = React.useCallback(() => {
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
      (async () => {
        try {
          return await changeThreadSettingsCall(updateThreadRequest);
        } catch (e) {
          Alert.alert('Avatar update failed', 'Unable to update avatar.');
          throw e;
        }
      })(),
      { customKeyName: `${changeThreadSettingsActionTypes.started}:avatar` },
    );
  }, [changeThreadSettingsCall, dispatchActionPromise, threadID]);

  return React.useMemo(
    () => [removeThreadAvatar, updateThreadAvatarLoadingStatus === 'loading'],
    [removeThreadAvatar, updateThreadAvatarLoadingStatus],
  );
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
        return 'Use Emoji';
      } else if (option.id === 'image') {
        return 'Select image';
      } else if (option.id === 'camera') {
        return 'Camera';
      } else if (option.id === 'ens') {
        return 'Use ENS Avatar';
      } else if (option.id === 'remove') {
        return 'Clear avatar';
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
  selectFromGallery,
  useUploadSelectedMedia,
  useUploadProcessedMedia,
  useProcessSelectedMedia,
  useShowAvatarActionSheet,
  useSelectFromGalleryAndUpdateThreadAvatar,
  useRemoveThreadAvatar,
};
