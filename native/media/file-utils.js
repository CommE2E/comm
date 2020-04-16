// @flow

import type {
  MediaMissionStep,
  MediaMissionFailure,
  MediaType,
} from 'lib/types/media-types';

import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import filesystem from 'react-native-fs';

import { pathFromURI } from 'lib/utils/file-utils';

async function fetchAssetInfo(
  mediaNativeID: string,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: {| localURI: ?string, orientation: ?number |},
|}> {
  let localURI,
    orientation,
    success = false,
    exceptionMessage;
  const start = Date.now();
  try {
    const assetInfo = await MediaLibrary.getAssetInfoAsync(mediaNativeID);
    success = true;
    localURI = assetInfo.localUri;
    if (Platform.OS === 'ios') {
      orientation = assetInfo.orientation;
    } else {
      orientation = assetInfo.exif && assetInfo.exif.Orientation;
    }
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      e.message &&
      typeof e.message === 'string'
    ) {
      exceptionMessage = e.message;
    }
  }
  return {
    steps: [
      {
        step: 'asset_info_fetch',
        success,
        exceptionMessage,
        time: Date.now() - start,
        localURI,
        orientation,
      },
    ],
    result: {
      localURI,
      orientation,
    },
  };
}

async function fetchFileSize(
  uri: string,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: ?number,
|}> {
  let fileSize,
    success = false,
    exceptionMessage;
  const statStart = Date.now();
  try {
    const result = await filesystem.stat(uri);
    success = true;
    fileSize = result.size;
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      e.message &&
      typeof e.message === 'string'
    ) {
      exceptionMessage = e.message;
    }
  }
  return {
    steps: [
      {
        step: 'stat_file',
        success,
        exceptionMessage,
        time: Date.now() - statStart,
        fileSize,
      },
    ],
    result: fileSize,
  };
}

type FetchFileInfoResult = {|
  success: true,
  uri: string,
  orientation: ?number,
  fileSize: number,
|};
async function fetchFileInfo(
  inputURI: string,
  mediaType: MediaType,
  mediaNativeID: ?string,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | FetchFileInfoResult,
|}> {
  const steps = [];
  let uri = inputURI,
    orientation;

  const needsLocalURI = !pathFromURI(inputURI);
  const needsOrientation = mediaType === 'photo';
  if (mediaNativeID && (needsLocalURI || needsOrientation)) {
    const {
      steps: assetInfoSteps,
      result: assetInfoResult,
    } = await fetchAssetInfo(mediaNativeID);
    steps.push(...assetInfoSteps);
    if (assetInfoResult.localURI) {
      uri = assetInfoResult.localURI;
    }
    if (assetInfoResult.orientation) {
      orientation = assetInfoResult.orientation;
    }
  }

  const path = pathFromURI(uri);
  if (!path) {
    return { steps, result: { success: false, reason: 'no_file_path' } };
  }

  const { steps: fileSizeSteps, result: fileSize } = await fetchFileSize(uri);
  steps.push(...fileSizeSteps);
  if (!fileSize) {
    return {
      steps,
      result: {
        success: false,
        reason: 'file_stat_failed',
      },
    };
  }

  return {
    steps,
    result: {
      success: true,
      uri,
      orientation,
      fileSize,
    },
  };
}

export { fetchFileInfo };
