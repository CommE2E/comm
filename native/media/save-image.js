// @flow

import type { MediaInfo } from 'lib/types/media-types';

import { Platform, PermissionsAndroid } from 'react-native';
import filesystem from 'react-native-fs';
import CameraRoll from '@react-native-community/cameraroll';
import invariant from 'invariant';

import { fileInfoFromData } from 'lib/utils/file-utils';

import { blobToDataURI, dataURIToIntArray } from '../utils/media-utils';

function saveImage(mediaInfo: MediaInfo) {
  if (Platform.OS === "android") {
    return saveImageAndroid(mediaInfo);
  } else if (Platform.OS === "ios") {
    return saveImageIOS(mediaInfo);
  } else {
    invariant(false, `saveImage unsupported on ${Platform.OS}`);
  }
}

// On Android, we save the image to our own SquadCal folder in the
// Pictures directory, and then trigger the media scanner to pick it up
async function saveImageAndroid(mediaInfo: MediaInfo) {
  const hasPermission = await getAndroidPermissions();
  if (!hasPermission) {
    return;
  }
  const saveFolder = `${filesystem.PicturesDirectoryPath}/SquadCal`;
  await filesystem.mkdir(saveFolder);
  const filePath = await saveToDisk(mediaInfo.uri, saveFolder);
  await filesystem.scanFile(filePath);
}

async function getAndroidPermissions() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: "Save Photo",
        message: "Requesting access to your external storage",
      },
    )
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('android_permissions');
    }
    return true;
  } catch (err) {
    return false;
  }
}

// On iOS, we save the image to the camera roll
async function saveImageIOS(mediaInfo: MediaInfo) {
  const { uri, type } = mediaInfo;

  let tempFile;
  if (uri.startsWith("http")) {
    tempFile = await saveToDisk(uri, filesystem.TemporaryDirectoryPath);
  }

  const saveURI = tempFile ? `file://${tempFile}` : uri;
  const result = await CameraRoll.saveToCameraRoll(saveURI, type);

  if (tempFile) {
    await filesystem.unlink(tempFile);
  }
}

async function saveToDisk(uri: string, directory: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const dataURI = await blobToDataURI(blob);
  const firstComma = dataURI.indexOf(',');
  invariant(firstComma > 4, 'malformed data-URI');
  const base64 = dataURI.substring(firstComma + 1);

  const intArray = dataURIToIntArray(dataURI);
  const fileName = blob.data.name ? blob.data.name : "";
  const fileInfo = fileInfoFromData(intArray, fileName);
  invariant(fileInfo, 'unsupported media type');
  const { name, mime } = fileInfo;
  const filePath = `${directory}/${name}`;

  await filesystem.writeFile(filePath, base64, 'base64');
  return filePath;
}

export {
  saveImage,
};
