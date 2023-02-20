// @flow

import base64 from 'base-64';
import * as MediaLibrary from 'expo-media-library';
import invariant from 'invariant';
import { Platform } from 'react-native';
import filesystem from 'react-native-fs';

import {
  mediaConfig,
  pathFromURI,
  fileInfoFromData,
  bytesNeededForFileTypeCheck,
} from 'lib/media/file-utils.js';
import type { Shape } from 'lib/types/core.js';
import type {
  MediaMissionStep,
  MediaMissionFailure,
  MediaType,
  ReadFileHeaderMediaMissionStep,
  DisposeTemporaryFileMediaMissionStep,
  MakeDirectoryMediaMissionStep,
  AndroidScanFileMediaMissionStep,
  FetchFileHashMediaMissionStep,
  CopyFileMediaMissionStep,
} from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { stringToIntArray } from './blob-utils.js';
import { ffmpeg } from './ffmpeg.js';

const defaultInputs = Object.freeze({});
const defaultFields = Object.freeze({});

type FetchFileInfoResult = {
  +success: true,
  +uri: string,
  +orientation: ?number,
  +fileSize: number,
  +mime: ?string,
  +mediaType: ?MediaType,
};
type OptionalInputs = Shape<{ +mediaNativeID: ?string }>;
type OptionalFields = Shape<{
  +orientation: boolean,
  +mediaType: boolean,
  +mime: boolean,
}>;
async function fetchFileInfo(
  inputURI: string,
  optionalInputs?: OptionalInputs = defaultInputs,
  optionalFields?: OptionalFields = defaultFields,
): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | FetchFileInfoResult,
}> {
  const { mediaNativeID } = optionalInputs;
  const steps = [];

  let assetInfoPromise, newLocalURI;
  const inputPath = pathFromURI(inputURI);
  if (mediaNativeID && (!inputPath || optionalFields.orientation)) {
    assetInfoPromise = (async () => {
      const { steps: assetInfoSteps, result: assetInfoResult } =
        await fetchAssetInfo(mediaNativeID);
      steps.push(...assetInfoSteps);
      newLocalURI = assetInfoResult.localURI;
      return assetInfoResult;
    })();
  }

  const getLocalURIPromise = (async () => {
    if (inputPath) {
      return { localURI: inputURI, path: inputPath };
    }
    if (!assetInfoPromise) {
      return null;
    }
    const { localURI } = await assetInfoPromise;
    if (!localURI) {
      return null;
    }
    const path = pathFromURI(localURI);
    if (!path) {
      return null;
    }
    return { localURI, path };
  })();

  const getOrientationPromise = (async () => {
    if (!optionalFields.orientation || !assetInfoPromise) {
      return null;
    }
    const { orientation } = await assetInfoPromise;
    return orientation;
  })();

  const getFileSizePromise = (async () => {
    const localURIResult = await getLocalURIPromise;
    if (!localURIResult) {
      return null;
    }
    const { localURI } = localURIResult;
    const { steps: fileSizeSteps, result: fileSize } = await fetchFileSize(
      localURI,
    );
    steps.push(...fileSizeSteps);
    return fileSize;
  })();

  const getTypesPromise = (async () => {
    if (!optionalFields.mime && !optionalFields.mediaType) {
      return { mime: null, mediaType: null };
    }
    const [localURIResult, fileSize] = await Promise.all([
      getLocalURIPromise,
      getFileSizePromise,
    ]);
    if (!localURIResult || !fileSize) {
      return { mime: null, mediaType: null };
    }
    const { localURI, path } = localURIResult;
    const readFileStep = await readFileHeader(localURI, fileSize);
    steps.push(readFileStep);
    const { mime, mediaType: baseMediaType } = readFileStep;
    if (!optionalFields.mediaType || !mime || !baseMediaType) {
      return { mime, mediaType: null };
    }
    const { steps: getMediaTypeSteps, result: mediaType } =
      await getMediaTypeInfo(path, mime, baseMediaType);
    steps.push(...getMediaTypeSteps);
    return { mime, mediaType };
  })();

  const [localURIResult, orientation, fileSize, types] = await Promise.all([
    getLocalURIPromise,
    getOrientationPromise,
    getFileSizePromise,
    getTypesPromise,
  ]);
  if (!localURIResult) {
    return { steps, result: { success: false, reason: 'no_file_path' } };
  }
  const uri = localURIResult.localURI;
  if (!fileSize) {
    return {
      steps,
      result: { success: false, reason: 'file_stat_failed', uri },
    };
  }

  let finalURI = uri;
  if (newLocalURI && newLocalURI !== uri) {
    finalURI = newLocalURI;
    console.log(
      'fetchAssetInfo returned localURI ' +
        `${newLocalURI} when we already had ${uri}`,
    );
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

async function fetchAssetInfo(mediaNativeID: string): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: { localURI: ?string, orientation: ?number },
}> {
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
    exceptionMessage = getMessageForException(e);
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

async function fetchFileSize(uri: string): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: ?number,
}> {
  let fileSize,
    success = false,
    exceptionMessage;
  const statStart = Date.now();
  try {
    const result = await filesystem.stat(uri);
    success = true;
    fileSize = result.size;
  } catch (e) {
    exceptionMessage = getMessageForException(e);
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
  const fetchBytes = Math.min(fileSize, bytesNeededForFileTypeCheck);

  const start = Date.now();
  let fileData,
    success = false,
    exceptionMessage;
  try {
    fileData = await filesystem.read(localURI, fetchBytes, 0, 'base64');
    success = true;
  } catch (e) {
    exceptionMessage = getMessageForException(e);
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

async function getMediaTypeInfo(
  path: string,
  mime: string,
  baseMediaType: MediaType,
): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: ?MediaType,
}> {
  if (!mediaConfig[mime] || mediaConfig[mime].mediaType !== 'photo_or_video') {
    return { steps: [], result: baseMediaType };
  }

  let hasMultipleFrames,
    success = false,
    exceptionMessage;
  const start = Date.now();
  try {
    hasMultipleFrames = await ffmpeg.hasMultipleFrames(path);
    success = true;
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  const steps = [
    {
      step: 'frame_count',
      success,
      exceptionMessage,
      time: Date.now() - start,
      path,
      mime,
      hasMultipleFrames,
    },
  ];
  const result = hasMultipleFrames ? 'video' : 'photo';
  return { steps, result };
}

async function disposeTempFile(
  path: string,
): Promise<DisposeTemporaryFileMediaMissionStep> {
  let success = false,
    exceptionMessage;
  const start = Date.now();
  try {
    await filesystem.unlink(path);
    success = true;
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  return {
    step: 'dispose_temporary_file',
    success,
    exceptionMessage,
    time: Date.now() - start,
    path,
  };
}

async function mkdir(path: string): Promise<MakeDirectoryMediaMissionStep> {
  let success = false,
    exceptionMessage;
  const start = Date.now();
  try {
    await filesystem.mkdir(path);
    success = true;
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  return {
    step: 'make_directory',
    success,
    exceptionMessage,
    time: Date.now() - start,
    path,
  };
}

async function androidScanFile(
  path: string,
): Promise<AndroidScanFileMediaMissionStep> {
  invariant(Platform.OS === 'android', 'androidScanFile only works on Android');
  let success = false,
    exceptionMessage;
  const start = Date.now();
  try {
    await filesystem.scanFile(path);
    success = true;
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  return {
    step: 'android_scan_file',
    success,
    exceptionMessage,
    time: Date.now() - start,
    path,
  };
}

async function fetchFileHash(
  path: string,
): Promise<FetchFileHashMediaMissionStep> {
  let hash, exceptionMessage;
  const start = Date.now();
  try {
    hash = await filesystem.hash(path, 'md5');
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  return {
    step: 'fetch_file_hash',
    success: !!hash,
    exceptionMessage,
    time: Date.now() - start,
    path,
    hash,
  };
}

async function copyFile(
  source: string,
  destination: string,
): Promise<CopyFileMediaMissionStep> {
  let success = false,
    exceptionMessage;
  const start = Date.now();
  try {
    await filesystem.copyFile(source, destination);
    success = true;
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  return {
    step: 'copy_file',
    success,
    exceptionMessage,
    time: Date.now() - start,
    source,
    destination,
  };
}

const temporaryDirectoryPath: string = Platform.select({
  ios: filesystem.TemporaryDirectoryPath,
  default: `${filesystem.TemporaryDirectoryPath}/`,
});

export {
  fetchAssetInfo,
  fetchFileInfo,
  temporaryDirectoryPath,
  disposeTempFile,
  mkdir,
  androidScanFile,
  fetchFileHash,
  copyFile,
};
