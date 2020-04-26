// @flow

import type { Viewer } from '../session/viewer';
import type { $Request } from 'express';
import type {
  UploadMultimediaResult,
  UploadDeletionRequest,
  Dimensions,
} from 'lib/types/media-types';

import multer from 'multer';

import { ServerError } from 'lib/utils/errors';

import createUploads from '../creators/upload-creator';
import { fetchUpload } from '../fetchers/upload-fetchers';
import { deleteUpload } from '../deleters/upload-deleters';
import { validateAndConvert } from './media-utils';

const upload = multer();
const multerProcessor = upload.array('multimedia');

type MulterFile = {|
  fieldname: string,
  originalname: string,
  encoding: string,
  mimetype: string,
  buffer: Buffer,
  size: number,
|};

type MultimediaUploadResult = {|
  results: UploadMultimediaResult[],
|};
async function multimediaUploadResponder(
  viewer: Viewer,
  req: $Request & { files?: $ReadOnlyArray<MulterFile> },
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

  const validationResults = await Promise.all(
    files.map(({ buffer, size, originalname }) =>
      validateAndConvert(
        buffer,
        overrideFilename ? overrideFilename : originalname,
        inputDimensions,
        inputLoop,
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
  const { content, mime } = await fetchUpload(viewer, uploadID, secret);
  res.type(mime);
  res.set('Cache-Control', 'public, max-age=31557600, immutable');
  res.send(content);
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
