// @flow

import type { Viewer } from '../session/viewer';
import type { $Request } from 'express';
import type { SendMultimediaMessageResponse } from 'lib/types/message-types';

import multer from 'multer';
import fileType from 'file-type';

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
  console.log(req.files);
  return { id: "test", time: 5 };
}

export {
  multerProcessor,
  multimediaMessageCreationResponder,
};
