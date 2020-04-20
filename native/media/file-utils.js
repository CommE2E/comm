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
import { stringToIntArray } from './blob-utils';

const defaultOptionalFields = Object.freeze({});

type FetchFileInfoResult = {|
  success: true,
  uri: string,
  orientation: ?number,
  fileSize: number,
  mime: ?string,
  mediaType: ?MediaType,
|};
type OptionalFields = $Shape<{| orientation: boolean, mime: boolean |}>;
async function fetchFileInfo(
  inputURI: string,
  mediaNativeID?: ?string,
  optionalFields?: OptionalFields = defaultOptionalFields,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | FetchFileInfoResult,
|}> {
  const steps = [];

  let assetInfoPromise, newLocalURI;
  const needsLocalURI = !pathFromURI(inputURI);
  if (mediaNativeID && (needsLocalURI || optionalFields.orientation)) {
    assetInfoPromise = (async () => {
      const {
        steps: assetInfoSteps,
        result: assetInfoResult,
      } = await fetchAssetInfo(mediaNativeID);
      steps.push(...assetInfoSteps);
      newLocalURI = assetInfoResult.localURI;
      return assetInfoResult;
    })();
  }

  const getLocalURIPromise = (async () => {
    if (!needsLocalURI) {
      return inputURI;
    }
    if (!assetInfoPromise) {
      return null;
    }
    const { localURI } = await assetInfoPromise;
    if (!localURI || !pathFromURI(localURI)) {
      return null;
    }
    return localURI;
  })();

  const getOrientationPromise = (async () => {
    if (!optionalFields.orientation || !assetInfoPromise) {
      return null;
    }
    const { orientation } = await assetInfoPromise;
    return orientation;
  })();

  const getFileSizePromise = (async () => {
    const localURI = await getLocalURIPromise;
    if (!localURI) {
      return null;
    }
    const { steps: fileSizeSteps, result: fileSize } = await fetchFileSize(
      localURI,
    );
    steps.push(...fileSizeSteps);
    return fileSize;
  })();

  const getTypesPromise = (async () => {
    if (!optionalFields.mime) {
      return { mime: null, mediaType: null };
    }
    const [localURI, fileSize] = await Promise.all([
      getLocalURIPromise,
      getFileSizePromise,
    ]);
    if (!localURI || !fileSize) {
      return { mime: null, mediaType: null };
    }
    const readFileStep = await readFileHeader(localURI, fileSize);
    steps.push(readFileStep);
    return {
      mime: readFileStep.mime,
      mediaType: readFileStep.mediaType,
    };
  })();

  const [uri, orientation, fileSize, types] = await Promise.all([
    getLocalURIPromise,
    getOrientationPromise,
    getFileSizePromise,
    getTypesPromise,
  ]);
  if (!uri) {
    return { steps, result: { success: false, reason: 'no_file_path' } };
  }
  if (!fileSize) {
    return {
      steps,
      result: { success: false, reason: 'file_stat_failed', uri },
    };
  }

  let finalURI = uri;
  if (newLocalURI && newLocalURI !== uri) {
    console.log(
      'fetchAssetInfo returned localURI ' +
        `${newLocalURI} when we already had ${uri}`,
    );
    finalURI = newLocalURI;
  }

  return {
    steps,
    result: {
      success: true,
      uri: finalURI,
      orientation,
      fileSize,
      mime: types.mime,
      mediaType: types.mediaType,
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
    const intArray = stringToIntArray(utf8);
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

export { fetchFileInfo };
