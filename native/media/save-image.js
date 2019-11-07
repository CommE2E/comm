// @flow

import type { MediaType } from 'lib/types/media-types';

import { Platform, PermissionsAndroid } from 'react-native';
import filesystem from 'react-native-fs';
import CameraRoll from '@react-native-community/cameraroll';
import invariant from 'invariant';

import { fileInfoFromData } from 'lib/utils/file-utils';

import { blobToDataURI, dataURIToIntArray } from '../utils/media-utils';
import { displayActionResultModal } from '../navigation/action-result-modal';
import { getAndroidPermission } from '../utils/android-permissions';

type SaveImageInfo = {
  uri: string,
  type: MediaType,
  ...
};

async function intentionalSaveImage(mediaInfo: SaveImageInfo) {
  let result, message;
  if (Platform.OS === "android") {
    result = await saveImageAndroid(mediaInfo, "request");
  } else if (Platform.OS === "ios") {
    result = await saveImageIOS(mediaInfo);
  } else {
    message = `saving images is unsupported on ${Platform.OS}`;
  }

  if (result) {
    message = "saved!";
  } else if (!message) {
    message = "don't have permission :(";
  }

  displayActionResultModal(message);
}

async function saveImage(mediaInfo: SaveImageInfo) {
  if (Platform.OS === "android") {
    await saveImageAndroid(mediaInfo, "check");
  } else if (Platform.OS === "ios") {
    await saveImageIOS(mediaInfo);
  }
}

// On Android, we save the image to our own SquadCal folder in the
// Pictures directory, and then trigger the media scanner to pick it up
async function saveImageAndroid(
  mediaInfo: SaveImageInfo,
  permissions: "check" | "request",
) {
  let hasPermission;
  if (permissions === "check") {
    hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
  } else {
    hasPermission = await getAndroidPermission(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: "Save Photo",
        message: "Requesting access to your external storage",
      },
    );
  }
  if (!hasPermission) {
    return false;
  }

  const saveFolder = `${filesystem.PicturesDirectoryPath}/SquadCal`;
  await filesystem.mkdir(saveFolder);
  const filePath = await saveToDisk(mediaInfo.uri, saveFolder);
  await filesystem.scanFile(filePath);
  return true;
}

// On iOS, we save the image to the camera roll
async function saveImageIOS(mediaInfo: SaveImageInfo) {
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
  return true;
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
  intentionalSaveImage,
  saveImage,
};
