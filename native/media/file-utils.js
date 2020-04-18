// @flow

import type {
  MediaMissionStep,
  MediaMissionFailure,
  MediaType,
  ReadFileHeaderMediaMissionStep,
} from 'lib/types/media-types';

import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import filesystem from 'react-native-fs';
import base64 from 'base-64';

import { pathFromURI, fileInfoFromData } from 'lib/utils/file-utils';

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
        uri,
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
        uri,
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

async function readFileHeader(
  localURI: string,
  fileSize: number,
): Promise<ReadFileHeaderMediaMissionStep> {
  const fetchBytes = Math.min(fileSize, 64);

  const start = Date.now();
  let fileData,
    success = false,
    exceptionMessage;
  try {
    fileData = await filesystem.read(localURI, fetchBytes, 0, 'base64');
    success = true;
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

  let mime, mediaType;
  if (fileData) {
    const utf8 = base64.decode(fileData);
    const intArray = new Uint8Array(utf8.length);
    for (var i = 0; i < utf8.length; i++) {
      intArray[i] = utf8.charCodeAt(i);
    }
    ({ mime, mediaType } = fileInfoFromData(intArray));
  }

  return {
    step: 'read_file_header',
    success,
    exceptionMessage,
    time: Date.now() - start,
    uri: localURI,
    mime,
    mediaType,
  };
}

export { fetchFileSize, fetchFileInfo, readFileHeader };
