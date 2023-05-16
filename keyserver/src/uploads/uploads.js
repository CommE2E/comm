// @flow

import type { $Request, $Response, Middleware } from 'express';
import invariant from 'invariant';
import multer from 'multer';
import { Readable } from 'stream';
import t from 'tcomb';

import type {
  UploadMediaMetadataRequest,
  UploadMultimediaResult,
  UploadDeletionRequest,
  Dimensions,
} from 'lib/types/media-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { tShape } from 'lib/utils/validation-utils.js';

import { getMediaType, validateAndConvert } from './media-utils.js';
import type { UploadInput } from '../creators/upload-creator.js';
import createUploads from '../creators/upload-creator.js';
import { deleteUpload } from '../deleters/upload-deleters.js';
import {
  fetchUpload,
  fetchUploadChunk,
  getUploadSize,
} from '../fetchers/upload-fetchers.js';
import type { MulterRequest } from '../responders/handlers.js';
import type { Viewer } from '../session/viewer.js';
import { validateInput } from '../utils/validation-utils.js';

const upload = multer();
const multerProcessor: Middleware<> = upload.array('multimedia');

type MultimediaUploadResult = {
  results: UploadMultimediaResult[],
};
async function multimediaUploadResponder(
  viewer: Viewer,
  req: MulterRequest,
): Promise<MultimediaUploadResult> {
  const { files, body } = req;
  if (!files || !body || typeof body !== 'object') {
    throw new ServerError('invalid_parameters');
  }
  const overrideFilename =
    files.length === 1 && body.filename ? body.filename : null;
  if (overrideFilename && typeof overrideFilename !== 'string') {
    throw new ServerError('invalid_parameters');
  }

  const inputHeight =
    files.length === 1 && body.height ? parseInt(body.height) : null;
  const inputWidth =
    files.length === 1 && body.width ? parseInt(body.width) : null;
  if (!!inputHeight !== !!inputWidth) {
    throw new ServerError('invalid_parameters');
  }
  const inputDimensions: ?Dimensions =
    inputHeight && inputWidth
      ? { height: inputHeight, width: inputWidth }
      : null;

  const inputLoop = !!(files.length === 1 && body.loop);

  const inputEncryptionKey =
    files.length === 1 && body.encryptionKey ? body.encryptionKey : null;
  if (inputEncryptionKey && typeof inputEncryptionKey !== 'string') {
    throw new ServerError('invalid_parameters');
  }
  const inputMimeType =
    files.length === 1 && body.mimeType ? body.mimeType : null;
  if (inputMimeType && typeof inputMimeType !== 'string') {
    throw new ServerError('invalid_parameters');
  }
  const inputThumbHash =
    files.length === 1 && body.thumbHash ? body.thumbHash : null;
  if (inputThumbHash && typeof inputThumbHash !== 'string') {
    throw new ServerError('invalid_parameters');
  }

  const validationResults = await Promise.all(
    files.map(({ buffer, size, originalname }) =>
      validateAndConvert({
        initialBuffer: buffer,
        initialName: overrideFilename ? overrideFilename : originalname,
        inputDimensions,
        inputLoop,
        inputEncryptionKey,
        inputMimeType,
        inputThumbHash,
        size,
      }),
    ),
  );
  const uploadInfos = validationResults.filter(Boolean);
  if (uploadInfos.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const results = await createUploads(viewer, uploadInfos);
  return { results };
}

const uploadMediaMetadataInputValidator = tShape({
  filename: t.String,
  width: t.Number,
  height: t.Number,
  blobHolder: t.String,
  encryptionKey: t.String,
  mimeType: t.String,
  loop: t.maybe(t.Boolean),
  thumbHash: t.maybe(t.String),
});

async function uploadMediaMetadataResponder(
  viewer: Viewer,
  input: any,
): Promise<UploadMultimediaResult> {
  const request: UploadMediaMetadataRequest = input;
  await validateInput(viewer, uploadMediaMetadataInputValidator, input);

  const mediaType = getMediaType(request.mimeType);
  if (!mediaType) {
    throw new ServerError('invalid_parameters');
  }

  const { filename, blobHolder, encryptionKey, mimeType, width, height, loop } =
    request;
  const uploadInfo: UploadInput = {
    name: filename,
    mime: mimeType,
    mediaType,
    content: { storage: 'blob_service', blobHolder },
    encryptionKey,
    dimensions: { width, height },
    loop: loop ?? false,
    thumbHash: request.thumbHash,
  };

  const [result] = await createUploads(viewer, [uploadInfo]);
  return result;
}

async function uploadDownloadResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<void> {
  const { uploadID, secret } = req.params;
  if (!uploadID || !secret) {
    throw new ServerError('invalid_parameters');
  }

  if (!req.headers.range) {
    const { content, mime } = await fetchUpload(viewer, uploadID, secret);
    res.type(mime);
    res.set('Cache-Control', 'public, max-age=31557600, immutable');
    if (process.env.NODE_ENV === 'development') {
      // Add a CORS header to allow local development using localhost
      const port = process.env.PORT || '3000';
      res.set('Access-Control-Allow-Origin', `http://localhost:${port}`);
      res.set('Access-Control-Allow-Methods', 'GET');
    }
    res.send(content);
  } else {
    const totalUploadSize = await getUploadSize(uploadID, secret);
    const range = req.range(totalUploadSize);
    if (typeof range === 'number' && range < 0) {
      throw new ServerError(
        range === -1 ? 'unsatisfiable_range' : 'malformed_header_string',
      );
    }

    invariant(
      Array.isArray(range),
      'range should be Array in uploadDownloadResponder!',
    );
    const { start, end } = range[0];
    const respWidth = end - start + 1;
    const { content, mime } = await fetchUploadChunk(
      uploadID,
      secret,
      start,
      respWidth,
    );
    const respRange = `${start}-${end}/${totalUploadSize}`;
    const respHeaders: { [key: string]: string } = {
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${respRange}`,
      'Content-Type': mime,
      'Content-Length': respWidth.toString(),
    };
    if (process.env.NODE_ENV === 'development') {
      // Add a CORS header to allow local development using localhost
      const port = process.env.PORT || '3000';
      respHeaders['Access-Control-Allow-Origin'] = `http://localhost:${port}`;
      respHeaders['Access-Control-Allow-Methods'] = 'GET';
    }

    // HTTP 206 Partial Content
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/206
    res.writeHead(206, respHeaders);
    const stream = new Readable();
    stream.push(content);
    stream.push(null);
    stream.pipe(res);
  }
}

async function uploadDeletionResponder(
  viewer: Viewer,
  request: UploadDeletionRequest,
): Promise<void> {
  const { id } = request;
  await deleteUpload(viewer, id);
}

export {
  multerProcessor,
  multimediaUploadResponder,
  uploadDownloadResponder,
  uploadDeletionResponder,
  uploadMediaMetadataResponder,
};
