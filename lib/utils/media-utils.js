// @flow

import fileType from 'file-type';

type FileInfo = {| name: string, mime: string |};
function fileInfoFromData(
  data: Uint8Array | Buffer,
  fileName: string,
): ?FileInfo {
  const fileTypeResult = fileType(data);
  if (!fileTypeResult) {
    return null;
  }
  const { ext, mime } = fileTypeResult;
  const mediaType = mimeTypesToMediaTypes[mime];
  if (!mediaType) {
    return null;
  }
  const [ readableFileName, extension ] = fileName.split('.');
  return { name: `${readableFileName}.${ext}`, mime };
}

const mimeTypesToMediaTypes = {
  "image/png": "photo",
  "image/jpeg": "photo",
  "image/gif": "photo",
};

export {
  fileInfoFromData,
  mimeTypesToMediaTypes,
};
