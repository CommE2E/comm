// @flow

import type {
  Dimensions,
  MediaType,
  MediaMissionStep,
  MediaMissionFailure,
} from 'lib/types/media-types';

import { Image } from 'react-native';
import base64 from 'base-64';
import invariant from 'invariant';

import {
  fileInfoFromData,
  mimeTypesToMediaTypes,
  pathFromURI,
  readableFilename,
} from 'lib/utils/file-utils';
import { promiseAll } from 'lib/utils/promises';

import { fetchFileInfo } from './file-utils';
import { processVideo } from './video-utils';
import { processImage } from './image-utils';

type ReactNativeBlob = Blob & {
  data: { type: string, name: string, size: number },
};
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

type FetchBlobResponse = {|
  blob: ReactNativeBlob,
  reportedMIME: ?string,
  reportedMediaType: ?string,
|};
async function fetchBlob(
  uri: string,
  type: MediaType,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: ?FetchBlobResponse,
|}> {
  const blobFetchStart = Date.now();
  let blob, reportedMIME, reportedMediaType, exceptionMessage;
  try {
    blob = await getBlobFromURI(uri, type);
    reportedMIME =
      uri.startsWith('ph://') && blob.type === 'application/octet-stream'
        ? 'video/quicktime'
        : blob.type;
    reportedMediaType = mimeTypesToMediaTypes[reportedMIME];
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

  const compareTypesStep = {
    step: 'compare_blob_mime_to_media_type',
    type,
    success: type === reportedMediaType,
    exceptionMessage,
    time: Date.now() - blobFetchStart,
    blobFetched: !!blob,
    blobMIME: blob ? blob.type : null,
    reportedMIME,
    blobName: blob && blob.data ? blob.data.name : null,
    size: blob ? blob.size : null,
  };

  if (!blob) {
    return { steps: [compareTypesStep], result: null };
  }

  const result = {
    blob,
    reportedMIME,
    reportedMediaType,
  };
  return { steps: [compareTypesStep], result };
}

function blobToDataURI(blob: Blob): Promise<string> {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onerror = error => {
      fileReader.abort();
      reject(error);
    };
    fileReader.onload = () => {
      invariant(
        typeof fileReader.result === 'string',
        'FileReader.readAsDataURL should result in string',
      );
      resolve(fileReader.result);
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

const defaultConfig = Object.freeze({});

type MediaInput = {|
  type: MediaType,
  uri: string,
  dimensions: Dimensions,
  filename: string,
  mediaNativeID?: string,
|};
type MediaProcessConfig = $Shape<{|
  initial_blob_check: boolean,
  final_blob_check: boolean,
  final_file_data_analysis: boolean,
|}>;
type MediaResult = {|
  success: true,
  uploadURI: string,
  shouldDisposePath: ?string,
  filename: string,
  mime: string,
  mediaType: MediaType,
  dimensions: Dimensions,
|};
async function processMedia(
  mediaInput: MediaInput,
  config: MediaProcessConfig = defaultConfig,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | MediaResult,
|}> {
  const steps = [];
  let initialURI = null,
    uploadURI = null,
    dimensions = mediaInput.dimensions,
    mime = null,
    mediaType = mediaInput.type;
  const finish = (failure?: MediaMissionFailure) => {
    if (failure) {
      return { steps, result: failure };
    }
    invariant(
      uploadURI && mime,
      "if we're finishing successfully we should have a URI and MIME type",
    );
    const shouldDisposePath =
      initialURI !== uploadURI ? pathFromURI(uploadURI) : null;
    const filename = readableFilename(mediaInput.filename, mime);
    invariant(filename, `could not construct filename for ${mime}`);
    return {
      steps,
      result: {
        success: true,
        uploadURI,
        shouldDisposePath,
        filename,
        mime,
        mediaType,
        dimensions,
      },
    };
  };

  const promises = {};
  promises.fileInfoResponse = fetchFileInfo(
    mediaInput.uri,
    mediaInput.mediaNativeID,
  );
  if (mediaInput.type === 'photo' || config.initial_blob_check) {
    promises.fetchBlobResponse = fetchBlob(mediaInput.uri, mediaType);
  }
  const { fileInfoResponse, fetchBlobResponse } = await promiseAll(promises);

  const { steps: fileInfoSteps, result: fileInfoResult } = fileInfoResponse;
  steps.push(...fileInfoSteps);
  if (!fileInfoResult.success) {
    return { steps, result: fileInfoResult };
  }
  const { orientation, fileSize } = fileInfoResult;
  initialURI = fileInfoResult.uri;

  let blobResponse;
  if (fetchBlobResponse) {
    const { steps: blobSteps, result: blobResult } = fetchBlobResponse;
    steps.push(...blobSteps);
    blobResponse = blobResult;
  }
  if (blobResponse) {
    if (blobResponse.reportedMIME) {
      mime = blobResponse.reportedMIME;
    }
    if (
      blobResponse.reportedMediaType &&
      blobResponse.reportedMediaType !== mediaType
    ) {
      return finish({
        success: false,
        reason: 'blob_reported_mime_issue',
        mime: blobResponse.reportedMIME,
      });
    }
  }

  if (mediaInput.type === 'video') {
    const { steps: videoSteps, result: videoResult } = await processVideo({
      uri: initialURI,
      filename: mediaInput.filename,
    });
    steps.push(...videoSteps);
    if (!videoResult.success) {
      return finish(videoResult);
    }
    uploadURI = videoResult.uri;
    mime = videoResult.mime;
  } else if (mediaInput.type === 'photo') {
    if (!mime) {
      return finish({
        success: false,
        reason: 'blob_reported_mime_issue',
        mime,
      });
    }
    const { steps: imageSteps, result: imageResult } = await processImage({
      uri: initialURI,
      dimensions,
      mime,
      fileSize,
      orientation,
    });
    steps.push(...imageSteps);
    if (!imageResult.success) {
      return finish(imageResult);
    }
    uploadURI = imageResult.uri;
    dimensions = imageResult.dimensions;
    mime = imageResult.mime;
  } else {
    invariant(false, `unknown mediaType ${mediaInput.type}`);
  }

  if (blobResponse && uploadURI !== initialURI) {
    blobResponse = null;
  }
  if (
    !blobResponse &&
    (config.final_blob_check || config.final_file_data_analysis)
  ) {
    const { steps: blobSteps, result: blobResult } = await fetchBlob(
      uploadURI,
      mediaType,
    );
    steps.push(...blobSteps);
    blobResponse = blobResult;
  }

  if (blobResponse && config.final_file_data_analysis) {
    const fileDataDetectionStart = Date.now();
    const dataURI = await blobToDataURI(blobResponse.blob);
    const intArray = dataURIToIntArray(dataURI);

    const fileDetectionResult = fileInfoFromData(intArray);
    const fileDetectionSuccess =
      !!fileDetectionResult.mime && fileDetectionResult.mediaType === mediaType;

    steps.push({
      step: 'final_file_data_analysis',
      success: fileDetectionSuccess,
      time: Date.now() - fileDataDetectionStart,
      uri: uploadURI,
      detectedMIME: fileDetectionResult.mime,
      detectedMediaType: fileDetectionResult.mediaType,
    });
    if (fileDetectionResult.mime) {
      mime = fileDetectionResult.mime;
    }

    if (mediaType === 'photo' && !fileDetectionSuccess) {
      return finish({
        success: false,
        reason: 'file_data_detected_mime_issue',
        reportedMIME: mime,
        reportedMediaType: mediaType,
        detectedMIME: fileDetectionResult.mime,
        detectedMediaType: fileDetectionResult.mediaType,
      });
    }
  }

  return finish();
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

function getCompatibleMediaURI(uri: string, ext: ?string): string {
  if (!ext) {
    return uri;
  }
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

export {
  blobToDataURI,
  dataURIToIntArray,
  processMedia,
  getDimensions,
  getCompatibleMediaURI,
};
