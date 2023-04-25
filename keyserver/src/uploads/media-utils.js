// @flow

import bmp from '@vingle/bmp-js';
import invariant from 'invariant';
import sharp from 'sharp';

import {
  serverTranscodableTypes,
  serverCanHandleTypes,
  readableFilename,
  mediaConfig,
} from 'lib/media/file-utils.js';
import { getImageProcessingPlan } from 'lib/media/image-utils.js';
import type { Dimensions } from 'lib/types/media-types.js';
import { deepFileInfoFromData } from 'web/media/file-utils.js';

import type { UploadInput } from '../creators/upload-creator.js';

function initializeSharp(buffer: Buffer, mime: string) {
  if (mime !== 'image/bmp') {
    return sharp(buffer);
  }
  const bitmap = bmp.decode(buffer, true);
  return sharp(bitmap.data, {
    raw: {
      width: bitmap.width,
      height: bitmap.height,
      channels: 4,
    },
  });
}

function getMediaType(inputMimeType: string): 'photo' | 'video' | null {
  if (!serverCanHandleTypes.has(inputMimeType)) {
    return null;
  }
  const mediaType = mediaConfig[inputMimeType]?.mediaType;
  invariant(
    mediaType === 'photo' || mediaType === 'video',
    `mediaType for ${inputMimeType} should be photo or video`,
  );
  return mediaType;
}

type ValidateAndConvertInput = {
  +initialBuffer: Buffer,
  +initialName: string,
  +inputDimensions: ?Dimensions,
  +inputLoop: boolean,
  +inputEncryptionKey: ?string,
  +inputMimeType: ?string,
  +size: number, // in bytes
};
async function validateAndConvert(
  input: ValidateAndConvertInput,
): Promise<?UploadInput> {
  const {
    initialBuffer,
    initialName,
    inputDimensions,
    inputLoop,
    inputEncryptionKey,
    inputMimeType,
    size, // in bytes
  } = input;

  // we don't want to transcode encrypted files
  if (inputEncryptionKey) {
    invariant(
      inputMimeType,
      'inputMimeType should be set in validateAndConvert for encrypted files',
    );
    invariant(
      inputDimensions,
      'inputDimensions should be set in validateAndConvert for encrypted files',
    );

    const mediaType = getMediaType(inputMimeType);
    if (!mediaType) {
      return null;
    }

    return {
      name: initialName,
      mime: inputMimeType,
      mediaType,
      buffer: initialBuffer,
      dimensions: inputDimensions,
      loop: inputLoop,
      encryptionKey: inputEncryptionKey,
    };
  }

  const { mime, mediaType } = deepFileInfoFromData(initialBuffer);
  if (!mime || !mediaType) {
    return null;
  }

  if (!serverCanHandleTypes.has(mime)) {
    return null;
  }

  if (mediaType === 'video') {
    invariant(
      inputDimensions,
      'inputDimensions should be set in validateAndConvert',
    );
    return {
      mime: mime,
      mediaType: mediaType,
      name: initialName,
      buffer: initialBuffer,
      dimensions: inputDimensions,
      loop: inputLoop,
    };
  }

  if (!serverTranscodableTypes.has(mime)) {
    // This should've gotten converted on the client
    return null;
  }

  return convertImage(
    initialBuffer,
    mime,
    initialName,
    inputDimensions,
    inputLoop,
    size,
  );
}

async function convertImage(
  initialBuffer: Buffer,
  mime: string,
  initialName: string,
  inputDimensions: ?Dimensions,
  inputLoop: boolean,
  size: number,
): Promise<?UploadInput> {
  let sharpImage, metadata;
  try {
    sharpImage = initializeSharp(initialBuffer, mime);
    metadata = await sharpImage.metadata();
  } catch (e) {
    return null;
  }

  let initialDimensions = inputDimensions;
  if (!initialDimensions) {
    if (metadata.orientation && metadata.orientation > 4) {
      initialDimensions = { width: metadata.height, height: metadata.width };
    } else {
      initialDimensions = { width: metadata.width, height: metadata.height };
    }
  }

  const plan = getImageProcessingPlan({
    inputMIME: mime,
    inputDimensions: initialDimensions,
    inputFileSize: size,
    inputOrientation: metadata.orientation,
  });
  if (plan.action === 'none') {
    const name = readableFilename(initialName, mime);
    invariant(name, `should be able to construct filename for ${mime}`);
    return {
      mime,
      mediaType: 'photo',
      name,
      buffer: initialBuffer,
      dimensions: initialDimensions,
      loop: inputLoop,
    };
  }
  console.log(`processing image with ${JSON.stringify(plan)}`);
  const { targetMIME, compressionRatio, fitInside, shouldRotate } = plan;

  if (shouldRotate) {
    sharpImage = sharpImage.rotate();
  }

  if (fitInside) {
    sharpImage = sharpImage.resize(fitInside.width, fitInside.height, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  if (targetMIME === 'image/png') {
    sharpImage = sharpImage.png();
  } else {
    sharpImage = sharpImage.jpeg({ quality: compressionRatio * 100 });
  }

  const { data: convertedBuffer, info } = await sharpImage.toBuffer({
    resolveWithObject: true,
  });
  const convertedDimensions = { width: info.width, height: info.height };

  const { mime: convertedMIME, mediaType: convertedMediaType } =
    deepFileInfoFromData(convertedBuffer);
  if (
    !convertedMIME ||
    !convertedMediaType ||
    convertedMIME !== targetMIME ||
    convertedMediaType !== 'photo'
  ) {
    return null;
  }

  const convertedName = readableFilename(initialName, targetMIME);
  if (!convertedName) {
    return null;
  }

  return {
    mime: targetMIME,
    mediaType: 'photo',
    name: convertedName,
    buffer: convertedBuffer,
    dimensions: convertedDimensions,
    loop: inputLoop,
  };
}

export { getMediaType, validateAndConvert };
