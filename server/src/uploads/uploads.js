// @flow

import type { Viewer } from '../session/viewer';
import type { $Request } from 'express';
import type { SendMultimediaMessageResponse } from 'lib/types/message-types';

import multer from 'multer';
import fileType from 'file-type';

import { fileInfoFromData } from 'lib/utils/media-utils';
import { ServerError } from 'lib/utils/errors';

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

async function multimediaMessageCreationResponder(
  viewer: Viewer,
  req: $Request & { files?: $ReadOnlyArray<MulterFile> },
): Promise<SendMultimediaMessageResponse> {
  console.log(req.body);
  const { files } = req;
  if (!files) {
    throw new ServerError('invalid_parameters');
  }
  const multerFilesWithInfos = files.map(multerFile => ({
    multerFile,
    fileInfo: fileInfoFromData(multerFile.buffer, multerFile.originalname),
  })).filter(Boolean);
  if (multerFilesWithInfos.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  console.log(multerFilesWithInfos);
  return { id: "test", time: 5 };
}

export {
  multerProcessor,
  multimediaMessageCreationResponder,
};
