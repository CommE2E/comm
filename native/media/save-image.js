// @flow

import { Platform, PermissionsAndroid } from 'react-native';
import filesystem from 'react-native-fs';
import invariant from 'invariant';
import * as MediaLibrary from 'expo-media-library';
import md5 from 'md5';

import { fileInfoFromData, readableFilename } from 'lib/utils/file-utils';

import { blobToDataURI, dataURIToIntArray } from './blob-utils';
import { getMediaLibraryIdentifier, getFetchableURI } from './identifier-utils';
import { displayActionResultModal } from '../navigation/action-result-modal';
import { getAndroidPermission } from '../utils/android-permissions';

type SaveImageInfo =
  | {
      type: 'photo',
      uri: string,
      ...
    }
  | {
      type: 'video',
      uri: string,
      ...
    };

async function intentionalSaveImage(mediaInfo: SaveImageInfo) {
  let errorMessage;
  if (Platform.OS === 'android') {
    errorMessage = await saveImageAndroid(mediaInfo, 'request');
  } else if (Platform.OS === 'ios') {
    errorMessage = await saveImageIOS(mediaInfo);
  } else {
    errorMessage = `saving images is unsupported on ${Platform.OS}`;
  }

  const message = errorMessage ? errorMessage : 'saved!';
  displayActionResultModal(message);
}

async function saveImage(mediaInfo: SaveImageInfo) {
  if (Platform.OS === 'android') {
    await saveImageAndroid(mediaInfo, 'check');
  } else if (Platform.OS === 'ios') {
    await saveImageIOS(mediaInfo);
  }
}

// On Android, we save the image to our own SquadCal folder in the
// Pictures directory, and then trigger the media scanner to pick it up
async function saveImageAndroid(
  mediaInfo: SaveImageInfo,
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

  const saveFolder = `${filesystem.PicturesDirectoryPath}/SquadCal/`;
  await filesystem.mkdir(saveFolder);

  const saveResult = await saveToDisk(mediaInfo.uri, saveFolder);
  if (!saveResult.success) {
    return saveResult.error;
  }
  await filesystem.scanFile(saveResult.path);

  return null;
}

// On iOS, we save the image to the camera roll
async function saveImageIOS(mediaInfo: SaveImageInfo) {
  let { uri } = mediaInfo;
  let tempFile;
  if (uri.startsWith('http')) {
    const saveResult = await saveToDisk(uri, filesystem.TemporaryDirectoryPath);
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
    await filesystem.unlink(tempFile);
  }
  return null;
}

// path to directory should end with a /
type SaveResult =
  | {| success: true, path: string |}
  | {| success: false, error: string |};
async function saveToDisk(
  inputURI: string,
  directory: string,
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

  const name = readableFilename(md5(dataURI), mime);
  if (!name) {
    return { success: false, error: 'failed to save :(' };
  }
  const path = `${directory}${name}`;

  try {
    await filesystem.writeFile(path, base64, 'base64');
  } catch {
    return { success: false, error: 'failed to save :(' };
  }

  return { success: true, path };
}

export { intentionalSaveImage, saveImage };
