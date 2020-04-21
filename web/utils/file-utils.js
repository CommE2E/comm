// @flow

import isSvg from 'is-svg';

import {
  fileInfoFromData,
  type FileDataInfo,
  mimeTypesToMediaTypes,
} from 'lib/utils/file-utils';

function deepFileInfoFromData(data: Buffer | ArrayBuffer): FileDataInfo {
  const result = fileInfoFromData(data);
  if (result.mime !== 'application/xml') {
    return result;
  }
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (!isSvg(buffer)) {
    return result;
  }
  const mime = 'image/svg+xml';
  return { mime, mediaType: mimeTypesToMediaTypes[mime] };
}

export { deepFileInfoFromData };
