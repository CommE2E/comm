// @flow

import type { $Request, $Response, Middleware } from 'express';
import invariant from 'invariant';
import multer from 'multer';
import { Readable } from 'stream';

import type {
  UploadMultimediaResult,
  UploadDeletionRequest,
  Dimensions,
} from 'lib/types/media-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { validateAndConvert } from './media-utils.js';
import createUploads from '../creators/upload-creator.js';
import { deleteUpload } from '../deleters/upload-deleters.js';
import {
  fetchUpload,
  fetchUploadChunk,
  getUploadSize,
} from '../fetchers/upload-fetchers.js';
import type { MulterRequest } from '../responders/handlers.js';
import type { Viewer } from '../session/viewer.js';

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

  const validationResults = await Promise.all(
    files.map(({ buffer, size, originalname }) =>
      validateAndConvert(
        buffer,
        overrideFilename ? overrideFilename : originalname,
        inputDimensions,
        inputLoop,
        inputEncryptionKey,
        inputMimeType,
        size,
      ),
    ),
  );
  const uploadInfos = validationResults.filter(Boolean);
  if (uploadInfos.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const results = await createUploads(viewer, uploadInfos);
  return { results };
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
    const respHeaders = {
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${respRange}`,
      'Content-Type': mime,
      'Content-Length': respWidth.toString(),
    };

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
};
