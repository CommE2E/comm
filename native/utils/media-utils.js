// @flow

import type { Dimensions, MediaType } from 'lib/types/media-types';

import { Platform, Image } from 'react-native';
import base64 from 'base-64';
import ImageResizer from 'react-native-image-resizer';

import {
  fileInfoFromData,
  mimeTypesToMediaTypes,
} from 'lib/utils/file-utils';

import { transcodeVideo } from './video-utils';

type ReactNativeBlob = 
  & Blob
  & { data: { type: string, name: string, size: number } };
export type MediaValidationResult =
  | {|
      mediaType: "photo",
      uri: string,
      dimensions: Dimensions,
      blob: ReactNativeBlob,
    |}
  | {|
      mediaType: "video",
      uri: string,
      dimensions: Dimensions,
      filename: string,
    |};
type ValidateMediaInput = {
  uri: string,
  height: number,
  width: number,
  type: MediaType,
  filename: string,
  ...
};
async function validateMedia(
  mediaInfo: ValidateMediaInput,
): Promise<?MediaValidationResult> {
  const { height, width, filename } = mediaInfo;
  const dimensions = { height, width };
  if (mediaInfo.type === "video") {
    return { mediaType: "video", uri: mediaInfo.uri, dimensions, filename };
  }

  // React Native always resolves FBMediaKit's ph:// scheme as an image so that
  // the Image component can render thumbnails of videos. In order to force
  // fetch() to return a blob of the video, we need to use the ph-upload://
  // scheme. https://git.io/Jerlh
  const fbMediaKitURL = mediaInfo.uri.startsWith('ph://');
  const uri = (fbMediaKitURL && mediaInfo.type === "video")
    ? mediaInfo.uri.replace(/^ph:/, 'ph-upload:')
    : mediaInfo.uri;

  const response = await fetch(uri);
  const blob = await response.blob();
  const reportedMIME = (fbMediaKitURL && blob.type === "application/octet-stream")
    ? "video/quicktime"
    : blob.type;

  const mediaType = mimeTypesToMediaTypes[reportedMIME];
  if (mediaType !== "photo") {
    return null;
  }
  return { mediaType: "photo", uri, dimensions, blob };
}

function blobToDataURI(blob: Blob): Promise<string> {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onerror = error => {
      fileReader.abort();
      reject(error);
    };
    fileReader.onload = event => {
      resolve(event.target.result);
    };
    fileReader.readAsDataURL(blob);
  });
}

function stringToIntArray(str: string): Uint8Array {
  const array = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    array[i] = str.charCodeAt(i);
  }
  return array;
}

function dataURIToIntArray(dataURI: string): Uint8Array {
  const uri = dataURI.replace(/\r?\n/g, '');

  const firstComma = uri.indexOf(',');
  if (firstComma <= 4) {
    throw new TypeError('malformed data-URI');
  }

  const meta = uri.substring(5, firstComma).split(';');
  const base64Encoded = meta.some(metum => metum === 'base64');

  let data = unescape(uri.substring(firstComma + 1));
  if (base64Encoded) {
    data = base64.decode(data);
  }

  return stringToIntArray(data);
}

function getDimensions(uri: string): Promise<Dimensions> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width: number, height: number) => resolve({ height, width }),
      reject,
    );
  });
}

export type MediaConversionResult = {|
  uploadURI: string,
  shouldDisposePath: ?string,
  name: string,
  mime: string,
  mediaType: MediaType,
  dimensions: Dimensions,
|};
async function convertMedia(
  validationResult: MediaValidationResult,
): Promise<?MediaConversionResult> {
  const { uri, dimensions } = validationResult;
  if (validationResult.mediaType === "video") {
    const result = await transcodeVideo(validationResult);
    if (!result) {
      return null;
    }
    const { uri: uploadURI, filename } = result.videoInfo;
    const shouldDisposePath = uri !== uploadURI ? uploadURI : null;
    return {
      uploadURI,
      shouldDisposePath,
      name: filename,
      mime: "video/mp4",
      mediaType: "video",
      dimensions,
    };
  }

  let { blob } = validationResult;

  const { type: reportedMIME, size } = blob;
  if (
    reportedMIME === "image/heic" ||
    size > 5e6 ||
    (size > 5e5 && (dimensions.width > 3000 || dimensions.height > 2000))
  ) {
    try {
      const compressFormat = reportedMIME === "image/png" ? "PNG" : "JPEG";
      const compressQuality = size > 5e6 ? 92 : 100;
      const { uri: resizedURI, path, name } =
        await ImageResizer.createResizedImage(
          uri,
          3000,
          2000,
          compressFormat,
          compressQuality,
        );
      const resizedDimensions = await getDimensions(resizedURI);
      return {
        uploadURI: resizedURI,
        shouldDisposePath: path,
        name,
        mime: reportedMIME === "image/png" ? "image/png" : "image/jpeg",
        mediaType: "photo",
        dimensions: resizedDimensions,
      };
    } catch (e) { }
  }

  const dataURI = await blobToDataURI(blob);
  const intArray = dataURIToIntArray(dataURI);

  const blobName = blob.data.name;
  const fileInfo = fileInfoFromData(intArray, blobName);
  if (!fileInfo) {
    return null;
  }

  const { name, mime, mediaType } = fileInfo;
  if (mediaType !== "photo") {
    return null;
  }
  return {
    uploadURI: Platform.OS === "ios" ? dataURI : uri,
    shouldDisposePath: null,
    name,
    mime,
    mediaType: "photo",
    dimensions,
  };
}

function getCompatibleMediaURI(uri: string, ext: string): string {
  if (!uri.startsWith('ph://') && !uri.startsWith('ph-upload://')) {
    return uri;
  }
  const photoKitLocalIdentifier = uri.split('/')[2];
  if (!photoKitLocalIdentifier) {
    return uri;
  }
  // While the ph:// scheme is a Facebook hack used by FBMediaKit, the
  // assets-library:// scheme is a legacy Apple identifier. Certain components
  // and libraries (namely react-native-video) don't know how to handle the
  // ph:// scheme yet, so we have to map to the legacy assets-library:// scheme
  return `assets-library://asset/asset.${ext}` +
    `?id=${photoKitLocalIdentifier}&ext=${ext}`;
}

export {
  validateMedia,
  blobToDataURI,
  dataURIToIntArray,
  convertMedia,
  getCompatibleMediaURI,
};
