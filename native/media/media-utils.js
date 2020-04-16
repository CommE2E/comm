// @flow

import type {
  Dimensions,
  MediaType,
  MediaMissionStep,
  MediaMissionFailure,
  BlobDataAnalysisMediaMissionStep,
} from 'lib/types/media-types';

import { Image } from 'react-native';
import invariant from 'invariant';

import { pathFromURI, readableFilename } from 'lib/utils/file-utils';
import { promiseAll } from 'lib/utils/promises';

import { fetchFileInfo } from './file-utils';
import { processVideo } from './video-utils';
import { processImage } from './image-utils';
import { getBlobDataInfo, fetchBlob, type ReactNativeBlob } from './blob-utils';

async function checkBlobData(
  uploadURI: string,
  blob: ReactNativeBlob,
  expectedMIME: string,
): Promise<BlobDataAnalysisMediaMissionStep> {
  let mime, mediaType, exceptionMessage;
  const start = Date.now();
  try {
    ({ mime, mediaType } = await getBlobDataInfo(blob));
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
  return {
    step: 'blob_data_analysis',
    success: !!mime && mime === expectedMIME,
    exceptionMessage,
    time: Date.now() - start,
    uri: uploadURI,
    detectedMIME: mime,
    detectedMediaType: mediaType,
  };
}

type MediaInput = {|
  type: MediaType,
  uri: string,
  dimensions: Dimensions,
  filename: string,
  mediaNativeID?: string,
|};
type MediaProcessConfig = $Shape<{|
  initialBlobCheck: boolean,
  finalBlobCheck: boolean,
  blobDataAnalysis: boolean,
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
  config: MediaProcessConfig,
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
    mediaInput.type,
    mediaInput.mediaNativeID,
  );
  if (mediaInput.type === 'photo' || config.initialBlobCheck) {
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
    const { reportedMIME, reportedMediaType } = blobResponse;
    if (reportedMIME) {
      mime = reportedMIME;
    }
    if (reportedMediaType && reportedMediaType !== mediaType) {
      return finish({
        success: false,
        reason: 'blob_reported_mime_issue',
        mime: reportedMIME,
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
  if (!blobResponse && (config.finalBlobCheck || config.blobDataAnalysis)) {
    const { steps: blobSteps, result: blobResult } = await fetchBlob(
      uploadURI,
      mediaType,
    );
    steps.push(...blobSteps);
    blobResponse = blobResult;
    const reportedMIME = blobResponse && blobResponse.reportedMIME;
    if (config.finalBlobCheck && reportedMIME && reportedMIME !== mime) {
      return finish({
        success: false,
        reason: 'blob_reported_mime_issue',
        mime: reportedMIME,
      });
    }
  }

  if (blobResponse && config.blobDataAnalysis) {
    const blobDataCheckStep = await checkBlobData(
      uploadURI,
      blobResponse.blob,
      mime,
    );
    steps.push(blobDataCheckStep);
    const { detectedMIME, detectedMediaType } = blobDataCheckStep;
    if (!blobDataCheckStep.success) {
      return finish({
        success: false,
        reason: 'blob_data_mime_type_mismatch',
        reportedMIME: mime,
        reportedMediaType: mediaType,
        detectedMIME,
        detectedMediaType,
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

export { processMedia, getDimensions, getCompatibleMediaURI };
