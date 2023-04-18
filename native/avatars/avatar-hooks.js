// @flow

import * as ImagePicker from 'expo-image-picker';
import * as React from 'react';

import { uploadMultimedia } from 'lib/actions/upload-actions.js';
import {
  extensionFromFilename,
  filenameFromPathOrURI,
} from 'lib/media/file-utils.js';
import type {
  MediaLibrarySelection,
  MediaMissionFailure,
  UploadMultimediaResult,
} from 'lib/types/media-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import { getCompatibleMediaURI } from '../media/identifier-utils.js';
import type { MediaResult } from '../media/media-utils.js';
import { processMedia } from '../media/media-utils.js';
import { useSelector } from '../redux/redux-utils.js';
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

function useSelectAndUploadFromGallery(): () => Promise<void> {
  const processSelectedMedia = useProcessSelectedMedia();
  const uploadProcessedMedia = useUploadProcessedMedia();

  const selectAndUploadFromGallery = React.useCallback(async () => {
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

  return selectAndUploadFromGallery;
}

export {
  useUploadProcessedMedia,
  useProcessSelectedMedia,
  useSelectAndUploadFromGallery,
};
