// @flow

import { Platform, PermissionsAndroid } from 'react-native';
import filesystem from 'react-native-fs';
import invariant from 'invariant';
import * as MediaLibrary from 'expo-media-library';
import md5 from 'md5';

import { fileInfoFromData, readableFilename } from 'lib/utils/file-utils';

import { blobToDataURI, dataURIToIntArray } from './blob-utils';
import { getMediaLibraryIdentifier } from './media-utils';
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

  const saveFolder = `${filesystem.PicturesDirectoryPath}/SquadCal`;
  await filesystem.mkdir(saveFolder);
  const filePath = await saveToDisk(mediaInfo.uri, saveFolder);
  await filesystem.scanFile(filePath);
  return null;
}

// On iOS, we save the image to the camera roll
async function saveImageIOS(mediaInfo: SaveImageInfo) {
  let { uri } = mediaInfo;
  let tempFile;
  if (uri.startsWith('http')) {
    tempFile = await saveToDisk(uri, filesystem.TemporaryDirectoryPath);
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

// only works on file: and http[s]: schemes
async function saveToDisk(uri: string, directory: string) {
  const response = await fetch(uri);
  const blob = await response.blob();

  const dataURI = await blobToDataURI(blob);
  const firstComma = dataURI.indexOf(',');
  invariant(firstComma > 4, 'malformed data-URI');
  const base64 = dataURI.substring(firstComma + 1);

  let mime = blob.type;
  if (!mime) {
    const intArray = dataURIToIntArray(dataURI);
    ({ mime } = fileInfoFromData(intArray));
  }
  invariant(mime, `unsupported media type in saveToDisk`);

  const name = readableFilename(md5(dataURI), mime);
  invariant(name, `unsupported mime type ${mime} in saveToDisk`);
  const filePath = `${directory}/${name}`;

  await filesystem.writeFile(filePath, base64, 'base64');
  return filePath;
}

export { intentionalSaveImage, saveImage };
