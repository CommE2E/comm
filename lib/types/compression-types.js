// @flow

import t, { type TInterface } from 'tcomb';

import { tShape, tString } from '../utils/validation-utils.js';

export type CompressedData = {
  +algo: 'brotli+base64',
  +data: string,
};

export const compressedDataValidator: TInterface<CompressedData> =
  tShape<CompressedData>({
    algo: tString('brotli+base64'),
    data: t.String,
  });
