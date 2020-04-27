// @flow

import { Platform, PermissionsAndroid } from 'react-native';
import filesystem from 'react-native-fs';
import invariant from 'invariant';
import * as MediaLibrary from 'expo-media-library';

import {
  fileInfoFromData,
  readableFilename,
  pathFromURI,
} from 'lib/utils/file-utils';
import { promiseAll } from 'lib/utils/promises';

import { blobToDataURI, dataURIToIntArray } from './blob-utils';
import { getMediaLibraryIdentifier, getFetchableURI } from './identifier-utils';
import { fetchFileInfo } from './file-utils';
import { displayActionResultModal } from '../navigation/action-result-modal';
import { getAndroidPermission } from '../utils/android-permissions';

async function intentionalSaveImage(uri: string) {
  let errorMessage;
  if (Platform.OS === 'android') {
    errorMessage = await saveImageAndroid(uri, 'request');
  } else if (Platform.OS === 'ios') {
    errorMessage = await saveImageIOS(uri);
  } else {
    errorMessage = `saving images is unsupported on ${Platform.OS}`;
  }

  const message = errorMessage ? errorMessage : 'saved!';
  displayActionResultModal(message);
}

async function saveImage(uri: string) {
  if (Platform.OS === 'android') {
    await saveImageAndroid(uri, 'check');
  } else if (Platform.OS === 'ios') {
    await saveImageIOS(uri);
  }
}

// On Android, we save the image to our own SquadCal folder in the
// Pictures directory, and then trigger the media scanner to pick it up
async function saveImageAndroid(
  inputURI: string,
  permissions: 'check' | 'request',
) {
  let hasPermission;
  if (permissions === 'check') {
    hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
  } else {
    hasPermission = await getAndroidPermission(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Save Photo',
        message: 'Requesting access to your external storage',
      },
    );
  }
  if (!hasPermission) {
    return "don't have permission :(";
  }

  const promises = [];
  const saveFolder = `${filesystem.PicturesDirectoryPath}/SquadCal/`;
  promises.push(filesystem.mkdir(saveFolder));

  let uri = inputURI;
  let tempFile, mime, error;
  if (uri.startsWith('http')) {
    promises.push(
      (async () => {
        const tempSaveResult = await saveRemoteMediaToDisk(
          uri,
          `${filesystem.TemporaryDirectoryPath}/`,
        );
        if (!tempSaveResult.success) {
          error = tempSaveResult.error;
        } else {
          tempFile = tempSaveResult.path;
          uri = `file://${tempFile}`;
          mime = tempSaveResult.mime;
        }
      })(),
    );
  }

  await Promise.all(promises);
  if (error) {
    return error;
  }

  const saveResult = await copyToSortedDirectory(uri, saveFolder, mime);
  if (!saveResult.success) {
    return saveResult.error;
  }
  filesystem.scanFile(saveResult.path);

  if (tempFile) {
    filesystem.unlink(tempFile);
  }
  return null;
}

// On iOS, we save the image to the camera roll
async function saveImageIOS(inputURI: string) {
  let uri = inputURI;
  let tempFile;
  if (uri.startsWith('http')) {
    const saveResult = await saveRemoteMediaToDisk(
      uri,
      filesystem.TemporaryDirectoryPath,
    );
    if (!saveResult.success) {
      return saveResult.error;
    }
    tempFile = saveResult.path;
    uri = `file://${tempFile}`;
  } else if (!uri.startsWith('file://')) {
    const mediaNativeID = getMediaLibraryIdentifier(uri);
    if (mediaNativeID) {
      try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(mediaNativeID);
        uri = assetInfo.localUri;
      } catch {}
    }
  }

  if (!uri.startsWith('file://')) {
    console.log(`could not resolve a path for ${uri}`);
    return 'failed to resolve :(';
  }

  await MediaLibrary.saveToLibraryAsync(uri);

  if (tempFile) {
    filesystem.unlink(tempFile);
  }
  return null;
}

type SaveResult =
  | {| success: true, path: string, mime: string |}
  | {| success: false, error: string |};
async function saveRemoteMediaToDisk(
  inputURI: string,
  directory: string, // should end with a /
): Promise<SaveResult> {
  const uri = getFetchableURI(inputURI);

  let blob;
  try {
    const response = await fetch(uri);
    blob = await response.blob();
  } catch {
    return { success: false, error: 'failed to resolve :(' };
  }

  let dataURI;
  try {
    dataURI = await blobToDataURI(blob);
  } catch {
    return { success: false, error: 'failed to resolve :(' };
  }

  const firstComma = dataURI.indexOf(',');
  invariant(firstComma > 4, 'malformed data-URI');
  const base64 = dataURI.substring(firstComma + 1);

  let mime = blob.type;
  if (!mime) {
    const intArray = dataURIToIntArray(dataURI);
    ({ mime } = fileInfoFromData(intArray));
  }
  if (!mime) {
    return { success: false, error: 'failed to save :(' };
  }

  const tempName = readableFilename('', mime);
  if (!tempName) {
    return { success: false, error: 'failed to save :(' };
  }
  const tempPath = `${directory}tempsave.${tempName}`;

  try {
    await filesystem.writeFile(tempPath, base64, 'base64');
  } catch {
    return { success: false, error: 'failed to save :(' };
  }

  return { success: true, path: tempPath, mime };
}

async function copyToSortedDirectory(
  localURI: string,
  directory: string, // should end with a /
  inputMIME: ?string,
): Promise<SaveResult> {
  const path = pathFromURI(localURI);
  if (!path) {
    return { success: false, error: 'failed to save :(' };
  }
  let mime = inputMIME;

  const promises = {};
  promises.hash = filesystem.hash(path, 'md5');
  if (!mime) {
    promises.fileInfoResult = fetchFileInfo(localURI, undefined, {
      mime: true,
    });
  }
  const { hash, fileInfoResult } = await promiseAll(promises);

  if (
    fileInfoResult &&
    fileInfoResult.result.success &&
    fileInfoResult.result.mime
  ) {
    mime = fileInfoResult.result.mime;
  }
  if (!mime) {
    return { success: false, error: 'failed to save :(' };
  }

  const name = readableFilename(hash, mime);
  if (!name) {
    return { success: false, error: 'failed to save :(' };
  }
  const newPath = `${directory}${name}`;

  try {
    await filesystem.copyFile(path, newPath);
  } catch {
    return { success: false, error: 'failed to save :(' };
  }

  return { success: true, path: newPath, mime };
}

export { intentionalSaveImage, saveImage };
