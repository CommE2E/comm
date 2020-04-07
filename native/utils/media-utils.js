// @flow

import type {
  Dimensions,
  MediaType,
  MediaMissionStep,
  MediaMissionFailure,
} from 'lib/types/media-types';

import { Image } from 'react-native';
import base64 from 'base-64';
import ImageResizer from 'react-native-image-resizer';
import invariant from 'invariant';

import {
  fileInfoFromData,
  mimeTypesToMediaTypes,
  stripExtension,
} from 'lib/utils/file-utils';

import { transcodeVideo } from './video-utils';

async function getBlobFromURI(
  uri: string,
  type: MediaType,
): Promise<ReactNativeBlob> {
  // React Native always resolves FBMediaKit's ph:// scheme as an image so that
  // the Image component can render thumbnails of videos. In order to force
  // fetch() to return a blob of the video, we need to use the ph-upload://
  // scheme. https://git.io/Jerlh
  const fbMediaKitURL = uri.startsWith('ph://');
  const fixedURI =
    fbMediaKitURL && type === 'video' ? uri.replace(/^ph:/, 'ph-upload:') : uri;
  const response = await fetch(fixedURI);
  return await response.blob();
}

type ClientPhotoInfo = {|
  type: 'photo',
  uri: string,
  dimensions: Dimensions,
  filename: string,
|};
type ClientVideoInfo = {|
  type: 'video',
  uri: string,
  dimensions: Dimensions,
  filename: string,
|};
type ClientMediaInfo = ClientPhotoInfo | ClientVideoInfo;

type ReactNativeBlob = Blob & {
  data: { type: string, name: string, size: number },
};
export type MediaValidationResult =
  | {|
      success: true,
      ...ClientPhotoInfo,
      blob: ReactNativeBlob,
    |}
  | {|
      success: true,
      ...ClientVideoInfo,
      blob: ?ReactNativeBlob,
    |};
async function validateMedia(
  mediaInfo: ClientMediaInfo,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | MediaValidationResult,
|}> {
  const { dimensions, uri, type, filename } = mediaInfo;
  const blobFetchStart = Date.now();

  let blob, reportedMIME, reportedMediaType;
  try {
    blob = await getBlobFromURI(uri, type);
    reportedMIME =
      uri.startsWith('ph://') && blob.type === 'application/octet-stream'
        ? 'video/quicktime'
        : blob.type;
    reportedMediaType = mimeTypesToMediaTypes[reportedMIME];
  } catch {}

  const validationStep = {
    step: 'validation',
    type,
    success: type === reportedMediaType,
    time: Date.now() - blobFetchStart,
    blobFetched: !!blob,
    blobMIME: blob ? blob.type : null,
    reportedMIME,
    blobName: blob && blob.data ? blob.data.name : null,
    size: blob ? blob.size : null,
  };

  let result;
  if (type === 'photo') {
    if (blob && reportedMediaType === 'photo') {
      result = {
        success: true,
        type: 'photo',
        uri,
        dimensions,
        filename,
        blob,
      };
    } else {
      result = {
        success: false,
        reason: 'blob_reported_mime_issue',
        mime: reportedMIME,
      };
    }
  } else {
    result = {
      success: true,
      type: 'video',
      uri,
      dimensions,
      filename,
      blob,
    };
  }

  return { steps: [validationStep], result };
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
  success: true,
  uploadURI: string,
  shouldDisposePath: ?string,
  name: string,
  mime: string,
  mediaType: MediaType,
  dimensions: Dimensions,
|};
async function convertMedia(
  validationResult: MediaValidationResult,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | MediaConversionResult,
|}> {
  let steps = [];
  let uploadURI = validationResult.uri,
    dimensions = validationResult.dimensions,
    shouldDisposePath = null,
    name = validationResult.filename,
    mime = null,
    mediaType = validationResult.type;
  const finish = (failure?: MediaMissionFailure) => {
    if (failure) {
      return { steps, result: failure };
    }
    invariant(
      mime,
      "if we're finishing successfully we should have a MIME type",
    );
    return {
      steps,
      result: {
        success: true,
        uploadURI,
        shouldDisposePath,
        name,
        mime,
        mediaType,
        dimensions,
      },
    };
  };

  if (validationResult.type === 'video') {
    const {
      steps: transcodeSteps,
      result: transcodeResult,
    } = await transcodeVideo(validationResult);
    steps = [...steps, ...transcodeSteps];
    if (!transcodeResult.success) {
      return finish(transcodeResult);
    }
    uploadURI = transcodeResult.uri;
    name = transcodeResult.filename;
    shouldDisposePath = validationResult.uri !== uploadURI ? uploadURI : null;
    mime = 'video/mp4';
  } else if (validationResult.type === 'photo') {
    const { type: reportedMIME, size } = validationResult.blob;
    if (
      reportedMIME === 'image/heic' ||
      size > 5e6 ||
      (size > 5e5 && (dimensions.width > 3000 || dimensions.height > 2000))
    ) {
      const photoResizeStart = Date.now();
      try {
        const compressFormat = reportedMIME === 'image/png' ? 'PNG' : 'JPEG';
        const compressQuality = size > 5e6 ? 92 : 100;
        const { uri: resizedURI, path } = await ImageResizer.createResizedImage(
          uploadURI,
          3000,
          2000,
          compressFormat,
          compressQuality,
        );
        uploadURI = resizedURI;
        if (reportedMIME === 'image/png' && !name.endsWith('.png')) {
          name = `${stripExtension(name)}.png`;
        } else if (reportedMIME !== 'image/png' && !name.endsWith('.jpg')) {
          name = `${stripExtension(name)}.jpg`;
        }
        shouldDisposePath = path;
        mime = reportedMIME === 'image/png' ? 'image/png' : 'image/jpeg';
        dimensions = await getDimensions(resizedURI);
      } catch (e) {}
      const success = uploadURI !== validationResult.uri;
      steps.push({
        step: 'photo_resize_transcode',
        success,
        time: Date.now() - photoResizeStart,
        newMIME: success ? mime : null,
        newDimensions: success ? dimensions : null,
        newURI: success ? uploadURI : null,
        newPath: success ? shouldDisposePath : null,
        newName: success ? name : null,
      });
      if (!success) {
        return finish({
          success: false,
          reason: 'too_large_cant_downscale',
          size,
        });
      }
    }
  }

  let { blob } = validationResult;
  if (uploadURI !== validationResult.uri) {
    const newMediaInfo =
      validationResult.type === 'video'
        ? {
            type: 'video',
            uri: uploadURI,
            dimensions,
            filename: name,
          }
        : {
            type: 'photo',
            uri: uploadURI,
            dimensions,
            filename: name,
          };
    const {
      steps: newValidationSteps,
      result: newValidationResult,
    } = await validateMedia(newMediaInfo);
    steps = [...steps, ...newValidationSteps];
    if (!newValidationResult.success) {
      return finish(newValidationResult);
    }
    blob = newValidationResult.blob;
  }

  let fileDataDetectionStep;
  if (blob) {
    const fileDataDetectionStart = Date.now();
    const dataURI = await blobToDataURI(blob);
    const intArray = dataURIToIntArray(dataURI);

    const fileDetectionResult = fileInfoFromData(intArray, name);
    fileDataDetectionStep = {
      step: 'final_file_data_analysis',
      success:
        !!fileDetectionResult.name &&
        !!fileDetectionResult.mime &&
        fileDetectionResult.mediaType === validationResult.type,
      time: Date.now() - fileDataDetectionStart,
      uri: uploadURI,
      detectedMIME: fileDetectionResult.mime,
      detectedMediaType: fileDetectionResult.mediaType,
      newName: fileDetectionResult.name,
    };
    steps.push(fileDataDetectionStep);
    if (fileDetectionResult.name) {
      name = fileDetectionResult.name;
    }
    if (fileDetectionResult.mime) {
      mime = fileDetectionResult.mime;
    }
  }

  if (
    validationResult.type === 'photo' &&
    uploadURI === validationResult.uri &&
    (!fileDataDetectionStep || !fileDataDetectionStep.success)
  ) {
    const reportedMIME = validationResult.blob.type;
    return finish({
      success: false,
      reason: 'file_data_detected_mime_issue',
      reportedMIME,
      reportedMediaType: validationResult.type,
      detectedMIME: mime,
      detectedMediaType: mediaType,
    });
  }

  return finish();
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
  // assets-library:// scheme is a legacy Apple identifier. We map to the former
  // because:
  // (1) Some libraries (namely react-native-video) don't know how to handle the
  //     ph:// scheme yet
  // (2) In RN0.60, uploading ph:// JPEGs leads to recompression and often
  //     increases file size! It has the nice side effect of rotating image data
  //     based on EXIF orientation, but this isn't worth it for us
  // https://github.com/facebook/react-native/issues/27099#issuecomment-602016225
  // https://github.com/expo/expo/issues/3177
  // https://github.com/react-native-community/react-native-video/issues/1572
  return (
    `assets-library://asset/asset.${ext}` +
    `?id=${photoKitLocalIdentifier}&ext=${ext}`
  );
}

async function processMedia(
  mediaInfo: ClientMediaInfo,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | MediaConversionResult,
|}> {
  const {
    result: validationResult,
    steps: validationSteps,
  } = await validateMedia(mediaInfo);
  if (!validationResult.success) {
    return { result: validationResult, steps: validationSteps };
  }
  const {
    result: conversionResult,
    steps: conversionSteps,
  } = await convertMedia(validationResult);
  const steps = [...validationSteps, ...conversionSteps];
  return { steps, result: conversionResult };
}

export {
  blobToDataURI,
  dataURIToIntArray,
  processMedia,
  getCompatibleMediaURI,
};
