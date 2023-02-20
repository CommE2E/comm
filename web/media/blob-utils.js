// @flow

import invariant from 'invariant';

import type {
  MediaType,
  MediaMissionStep,
  MediaMissionFailure,
} from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { determineFileType } from './file-utils.js';

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onerror = error => {
      fileReader.abort();
      reject(error);
    };
    fileReader.onload = () => {
      invariant(
        fileReader.result instanceof ArrayBuffer,
        'FileReader.readAsArrayBuffer should result in ArrayBuffer',
      );
      resolve(fileReader.result);
    };
    fileReader.readAsArrayBuffer(blob);
  });
}

type ProbeFileSuccess = {
  success: true,
  file: File,
  mediaType: MediaType,
};
async function probeFile(file: File): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | ProbeFileSuccess,
}> {
  const steps = [];

  let arrayBuffer, arrayBufferExceptionMessage;
  const arrayBufferStart = Date.now();
  try {
    arrayBuffer = await blobToArrayBuffer(file);
  } catch (e) {
    arrayBufferExceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'array_buffer_from_blob',
    success: !!arrayBuffer,
    exceptionMessage: arrayBufferExceptionMessage,
    time: Date.now() - arrayBufferStart,
  });
  if (!arrayBuffer) {
    return { steps, result: { success: false, reason: 'array_buffer_failed' } };
  }

  const determineFileTypeStep = determineFileType(arrayBuffer, file.name);
  steps.push(determineFileTypeStep);
  const {
    outputMIME: mime,
    outputMediaType: mediaType,
    outputFilename: name,
  } = determineFileTypeStep;
  if (!mime || !mediaType || !name) {
    return {
      steps,
      result: {
        success: false,
        reason: 'media_type_fetch_failed',
        detectedMIME: mime,
      },
    };
  }

  const fixedFile =
    name !== file.name || mime !== file.type
      ? new File([file], name, { type: mime })
      : file;
  return { steps, result: { success: true, file: fixedFile, mediaType } };
}

export { probeFile };
