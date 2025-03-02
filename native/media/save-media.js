// @flow

import Clipboard from '@react-native-clipboard/clipboard';
import * as MediaLibrary from 'expo-media-library';
import invariant from 'invariant';
import * as React from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import filesystem from 'react-native-fs';

import { queueReportsActionType } from 'lib/actions/report-actions.js';
import { useInvalidCSATLogOut } from 'lib/actions/user-actions.js';
import { readableFilename, pathFromURI } from 'lib/media/file-utils.js';
import { isLocalUploadID } from 'lib/media/media-utils.js';
import type {
  MediaMissionStep,
  MediaMissionResult,
  MediaMissionFailure,
  MediaInfo,
} from 'lib/types/media-types.js';
import {
  reportTypes,
  type ClientMediaMissionReportCreationRequest,
} from 'lib/types/report-types.js';
import { isBlobServiceURI } from 'lib/utils/blob-service.js';
import { getConfig } from 'lib/utils/config.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import {
  generateReportID,
  useIsReportEnabled,
} from 'lib/utils/report-utils.js';

import { fetchBlob } from './blob-utils.js';
import { fetchAndDecryptMedia } from './encryption-utils.js';
import {
  fetchAssetInfo,
  fetchFileInfo,
  disposeTempFile,
  mkdir,
  androidScanFile,
  fetchFileHash,
  copyFile,
  temporaryDirectoryPath,
  type FetchFileInfoResult,
} from './file-utils.js';
import { getMediaLibraryIdentifier } from './identifier-utils.js';
import { commCoreModule } from '../native-modules.js';
import { displayActionResultModal } from '../navigation/action-result-modal.js';
import { requestAndroidPermission } from '../utils/android-permissions.js';

export type IntentionalSaveMediaIDs = {
  +uploadID?: ?string,
  +messageServerID?: ?string,
  +messageLocalID?: ?string,
};

export type IntentionalSaveMedia = (
  mediaInfo: MediaInfo,
  ids?: ?IntentionalSaveMediaIDs,
) => Promise<void>;

function useIntentionalSaveMedia(): IntentionalSaveMedia {
  const dispatch = useDispatch();
  const mediaReportsEnabled = useIsReportEnabled('mediaReports');
  const invalidTokenLogOut = useInvalidCSATLogOut();
  return React.useCallback(
    async (mediaInfo: MediaInfo, ids?: ?IntentionalSaveMediaIDs) => {
      const start = Date.now();
      const { uri: mediaURI, blobURI, holder, encryptionKey } = mediaInfo;
      const uri = mediaURI ?? blobURI ?? holder;
      invariant(uri, 'mediaInfo should have a uri or a blobURI');

      const steps: Array<MediaMissionStep> = [
        { step: 'save_media', uri, time: start },
      ];

      const { resultPromise, reportPromise } = saveMedia(
        uri,
        encryptionKey,
        'request',
      );
      const result = await resultPromise;
      const userTime = Date.now() - start;

      let message;
      if (result.success) {
        message = 'saved!';
      } else if (result.reason === 'invalid_csat') {
        void invalidTokenLogOut();
        return;
      } else if (result.reason === 'save_unsupported') {
        const os: string = Platform.select({
          ios: 'iOS',
          android: 'Android',
          default: Platform.OS,
        });
        message = `saving media is unsupported on ${os}`;
      } else if (result.reason === 'missing_permission') {
        message = 'don’t have permission :(';
      } else if (
        result.reason === 'resolve_failed' ||
        result.reason === 'data_uri_failed'
      ) {
        message = 'failed to resolve :(';
      } else if (result.reason === 'fetch_failed') {
        message = 'failed to download :(';
      } else {
        message = 'failed to save :(';
      }
      displayActionResultModal(message);

      if (!mediaReportsEnabled) {
        return;
      }
      const reportSteps = await reportPromise;
      steps.push(...reportSteps);
      const totalTime = Date.now() - start;
      const mediaMission = { steps, result, userTime, totalTime };

      const uploadID = ids?.uploadID;
      const messageServerID = ids?.messageServerID;
      const messageLocalID = ids?.messageLocalID;

      const uploadIDIsLocal = uploadID ? isLocalUploadID(uploadID) : false;
      const report: ClientMediaMissionReportCreationRequest = {
        type: reportTypes.MEDIA_MISSION,
        time: Date.now(),
        platformDetails: getConfig().platformDetails,
        mediaMission,
        uploadServerID: uploadIDIsLocal ? undefined : uploadID,
        uploadLocalID: uploadIDIsLocal ? uploadID : undefined,
        messageServerID,
        messageLocalID,
        id: generateReportID(),
      };
      dispatch({
        type: queueReportsActionType,
        payload: { reports: [report] },
      });
    },
    [dispatch, mediaReportsEnabled, invalidTokenLogOut],
  );
}

type Permissions = 'check' | 'request';

function saveMedia(
  uri: string,
  encryptionKey?: ?string,
  permissions?: Permissions = 'check',
): {
  resultPromise: Promise<MediaMissionResult>,
  reportPromise: Promise<$ReadOnlyArray<MediaMissionStep>>,
} {
  let resolveResult;
  const sendResult = (result: MediaMissionResult) => {
    if (resolveResult) {
      resolveResult(result);
    }
  };

  const reportPromise = innerSaveMedia(
    uri,
    encryptionKey,
    permissions,
    sendResult,
  );
  const resultPromise = new Promise<MediaMissionResult>(resolve => {
    resolveResult = resolve;
  });

  return { reportPromise, resultPromise };
}

async function innerSaveMedia(
  uri: string,
  encryptionKey?: ?string,
  permissions: Permissions,
  sendResult: (result: MediaMissionResult) => void,
): Promise<$ReadOnlyArray<MediaMissionStep>> {
  if (Platform.OS === 'android') {
    return await saveMediaAndroid(uri, encryptionKey, permissions, sendResult);
  } else if (Platform.OS === 'ios') {
    return await saveMediaIOS(uri, encryptionKey, sendResult);
  } else {
    sendResult({ success: false, reason: 'save_unsupported' });
    return [];
  }
}

const androidSavePermission =
  PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;

// On Android, we save the media to our own Comm folder in the
// Pictures directory, and then trigger the media scanner to pick it up
async function saveMediaAndroid(
  inputURI: string,
  encryptionKey?: ?string,
  permissions: Permissions,
  sendResult: (result: MediaMissionResult) => void,
): Promise<$ReadOnlyArray<MediaMissionStep>> {
  const steps: Array<MediaMissionStep> = [];

  let hasPermission = false,
    permissionCheckExceptionMessage;
  const permissionCheckStart = Date.now();
  try {
    hasPermission = await requestAndroidPermission(
      androidSavePermission,
      'throw',
    );
  } catch (e) {
    permissionCheckExceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'permissions_check',
    success: hasPermission,
    exceptionMessage: permissionCheckExceptionMessage,
    time: Date.now() - permissionCheckStart,
    platform: Platform.OS,
    permissions: [androidSavePermission],
  });
  if (!hasPermission) {
    sendResult({ success: false, reason: 'missing_permission' });
    return steps;
  }

  const promises = [];
  let success = true;
  const saveFolder = `${filesystem.PicturesDirectoryPath}/Comm/`;
  promises.push(
    (async () => {
      const makeDirectoryStep = await mkdir(saveFolder);
      if (!makeDirectoryStep.success) {
        success = false;
        sendResult({ success, reason: 'make_directory_failed' });
      }
      steps.push(makeDirectoryStep);
    })(),
  );

  let uri = inputURI;
  let tempFile, mime;
  if (uri.startsWith('http') || isBlobServiceURI(uri)) {
    promises.push(
      (async () => {
        const { result: tempSaveResult, steps: tempSaveSteps } =
          await saveRemoteMediaToDisk(
            uri,
            encryptionKey,
            temporaryDirectoryPath,
          );
        steps.push(...tempSaveSteps);
        if (!tempSaveResult.success) {
          success = false;
          sendResult(tempSaveResult);
        } else {
          tempFile = tempSaveResult.path;
          uri = `file://${tempFile}`;
          mime = tempSaveResult.mime;
        }
      })(),
    );
  }

  await Promise.all(promises);
  if (!success) {
    return steps;
  }

  const { result: copyResult, steps: copySteps } = await copyToSortedDirectory(
    uri,
    saveFolder,
    mime,
  );
  steps.push(...copySteps);
  if (!copyResult.success) {
    sendResult(copyResult);
    return steps;
  }
  sendResult({ success: true });

  const postResultPromises = [];

  postResultPromises.push(
    (async () => {
      const scanFileStep = await androidScanFile(copyResult.path);
      steps.push(scanFileStep);
    })(),
  );

  if (tempFile) {
    postResultPromises.push(
      (async (file: string) => {
        const disposeStep = await disposeTempFile(file);
        steps.push(disposeStep);
      })(tempFile),
    );
  }

  await Promise.all(postResultPromises);
  return steps;
}

// On iOS, we save the media to the camera roll
async function saveMediaIOS(
  inputURI: string,
  encryptionKey?: ?string,
  sendResult: (result: MediaMissionResult) => void,
): Promise<$ReadOnlyArray<MediaMissionStep>> {
  const steps: Array<MediaMissionStep> = [];

  const saveMediaToDiskIOSResult = await saveMediaToDiskIOS(
    inputURI,
    encryptionKey,
  );

  steps.push(...saveMediaToDiskIOSResult.steps);
  const { tempFilePath } = saveMediaToDiskIOSResult;

  if (!saveMediaToDiskIOSResult.success) {
    if (tempFilePath) {
      const disposeStep = await disposeTempFile(tempFilePath);
      steps.push(disposeStep);
    }
    sendResult(saveMediaToDiskIOSResult.result);
    return steps;
  }

  const { uri } = saveMediaToDiskIOSResult;

  let success = false,
    exceptionMessage;
  const start = Date.now();
  try {
    await MediaLibrary.saveToLibraryAsync(uri);
    success = true;
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'ios_save_to_library',
    success,
    exceptionMessage,
    time: Date.now() - start,
    uri,
  });

  if (success) {
    sendResult({ success: true });
  } else {
    sendResult({ success: false, reason: 'save_to_library_failed', uri });
  }

  if (tempFilePath) {
    const disposeStep = await disposeTempFile(tempFilePath);
    steps.push(disposeStep);
  }
  return steps;
}

type SaveMediaToDiskIOSResult =
  | {
      +success: true,
      +uri: string,
      +tempFilePath: ?string,
      +steps: $ReadOnlyArray<MediaMissionStep>,
    }
  | {
      +success: false,
      +result: MediaMissionResult,
      +tempFilePath?: ?string,
      +steps: $ReadOnlyArray<MediaMissionStep>,
    };
async function saveMediaToDiskIOS(
  inputURI: string,
  encryptionKey?: ?string,
): Promise<SaveMediaToDiskIOSResult> {
  const steps: Array<MediaMissionStep> = [];

  let uri = inputURI;
  let tempFilePath;
  if (uri.startsWith('http') || isBlobServiceURI(uri)) {
    const { result: tempSaveResult, steps: tempSaveSteps } =
      await saveRemoteMediaToDisk(uri, encryptionKey, temporaryDirectoryPath);
    steps.push(...tempSaveSteps);
    if (!tempSaveResult.success) {
      return {
        success: false,
        result: tempSaveResult,
        steps,
      };
    }
    tempFilePath = tempSaveResult.path;
    uri = `file://${tempFilePath}`;
  } else if (!uri.startsWith('file://')) {
    const mediaNativeID = getMediaLibraryIdentifier(uri);
    if (mediaNativeID) {
      const { result: fetchAssetInfoResult, steps: fetchAssetInfoSteps } =
        await fetchAssetInfo(mediaNativeID);
      steps.push(...fetchAssetInfoSteps);
      const { localURI } = fetchAssetInfoResult;
      if (localURI) {
        uri = localURI;
      }
    }
  }

  if (!uri.startsWith('file://')) {
    return {
      success: false,
      result: { success: false, reason: 'resolve_failed', uri },
      tempFilePath,
      steps,
    };
  }

  return {
    success: true,
    uri,
    tempFilePath,
    steps,
  };
}

type IntermediateSaveResult = {
  +result:
    | { +success: true, +path: string, +mime: string }
    | MediaMissionFailure,
  +steps: $ReadOnlyArray<MediaMissionStep>,
};

async function saveRemoteMediaToDisk(
  inputURI: string,
  encryptionKey?: ?string,
  directory: string, // should end with a /
): Promise<IntermediateSaveResult> {
  const steps: Array<MediaMissionStep> = [];
  if (encryptionKey) {
    const authMetadata = await commCoreModule.getCommServicesAuthMetadata();

    const { steps: decryptionSteps, result: decryptionResult } =
      await fetchAndDecryptMedia(inputURI, encryptionKey, authMetadata, {
        destination: 'file',
        destinationDirectory: directory,
      });
    steps.push(...decryptionSteps);
    if (!decryptionResult.success) {
      return { result: decryptionResult, steps };
    }
    const { uri } = decryptionResult;
    const path = pathFromURI(uri);
    if (!path) {
      return {
        result: { success: false, reason: 'resolve_failed', uri },
        steps,
      };
    }

    const { steps: fetchFileInfoSteps, result: fetchFileInfoResult } =
      await fetchFileInfo(uri, undefined, {
        mime: true,
      });
    steps.push(...fetchFileInfoSteps);
    if (!fetchFileInfoResult.success) {
      return { result: fetchFileInfoResult, steps };
    }
    const { mime } = fetchFileInfoResult;
    if (!mime) {
      return {
        steps,
        result: {
          success: false,
          reason: 'media_type_fetch_failed',
          detectedMIME: mime,
        },
      };
    }

    return {
      result: { success: true, path, mime },
      steps,
    };
  }

  const { result: fetchBlobResult, steps: fetchBlobSteps } =
    await fetchBlob(inputURI);
  steps.push(...fetchBlobSteps);
  if (!fetchBlobResult.success) {
    return { result: fetchBlobResult, steps };
  }
  const { mime, base64 } = fetchBlobResult;

  const tempName = readableFilename('', mime);
  if (!tempName) {
    return {
      result: { success: false, reason: 'mime_check_failed', mime },
      steps,
    };
  }
  const tempPath = `${directory}tempsave.${tempName}`;

  const start = Date.now();
  let success = false,
    exceptionMessage;
  try {
    await filesystem.writeFile(tempPath, base64, 'base64');
    success = true;
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'write_file',
    success,
    exceptionMessage,
    time: Date.now() - start,
    path: tempPath,
    length: base64.length,
  });

  if (!success) {
    return { result: { success: false, reason: 'write_file_failed' }, steps };
  }
  return { result: { success: true, path: tempPath, mime }, steps };
}

async function copyToSortedDirectory(
  localURI: string,
  directory: string, // should end with a /
  inputMIME: ?string,
): Promise<IntermediateSaveResult> {
  const steps: Array<MediaMissionStep> = [];

  const path = pathFromURI(localURI);
  if (!path) {
    return {
      result: { success: false, reason: 'resolve_failed', uri: localURI },
      steps,
    };
  }
  let mime = inputMIME;

  const hashStepPromise = fetchFileHash(path);
  const fileInfoPromise: Promise<?{
    steps: $ReadOnlyArray<MediaMissionStep>,
    result: MediaMissionFailure | FetchFileInfoResult,
  }> = (async () => {
    if (mime) {
      return undefined;
    }
    return await fetchFileInfo(localURI, undefined, {
      mime: true,
    });
  })();
  const [hashStep, fileInfoResult] = await Promise.all([
    hashStepPromise,
    fileInfoPromise,
  ]);

  steps.push(hashStep);
  if (!hashStep.success) {
    return {
      result: { success: false, reason: 'fetch_file_hash_failed' },
      steps,
    };
  }
  const { hash } = hashStep;
  invariant(hash, 'hash should be truthy if hashStep.success is truthy');

  if (fileInfoResult) {
    steps.push(...fileInfoResult.steps);
    if (fileInfoResult.result.success && fileInfoResult.result.mime) {
      ({ mime } = fileInfoResult.result);
    }
  }
  if (!mime) {
    return {
      result: { success: false, reason: 'mime_check_failed', mime },
      steps,
    };
  }

  const name = readableFilename(hash, mime);
  if (!name) {
    return {
      result: { success: false, reason: 'mime_check_failed', mime },
      steps,
    };
  }
  const newPath = `${directory}${name}`;

  const copyStep = await copyFile(path, newPath);
  steps.push(copyStep);
  if (!copyStep.success) {
    return {
      result: { success: false, reason: 'copy_file_failed' },
      steps,
    };
  }

  return {
    result: { success: true, path: newPath, mime },
    steps,
  };
}

async function copyMediaIOS(
  mediaInfo: MediaInfo,
): Promise<{ +success: boolean }> {
  const { uri: mediaURI, blobURI, holder, encryptionKey } = mediaInfo;
  const inputURI = mediaURI ?? blobURI ?? holder;
  invariant(inputURI, 'mediaInfo should have a uri or a blobURI');

  const saveMediaToDiskIOSResult = await saveMediaToDiskIOS(
    inputURI,
    encryptionKey,
  );

  if (!saveMediaToDiskIOSResult.success) {
    const { tempFilePath } = saveMediaToDiskIOSResult;
    if (tempFilePath) {
      await disposeTempFile(tempFilePath);
    }
    return { success: false };
  }

  const { uri } = saveMediaToDiskIOSResult;
  return new Promise<{ +success: boolean }>(resolve => {
    Clipboard.setImageFromURL(uri, success => {
      resolve({ success });
    });
  });
}

export { useIntentionalSaveMedia, saveMedia, copyMediaIOS };
