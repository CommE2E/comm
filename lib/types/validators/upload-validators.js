// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../../utils/validation-utils.js';
import { uploadMultimediaResultValidator } from '../media-types.js';
import { type MultimediaUploadResult } from '../media-types.js';

export const MultimediaUploadResultValidator: TInterface<MultimediaUploadResult> =
  tShape<MultimediaUploadResult>({
    results: t.list(uploadMultimediaResultValidator),
  });
