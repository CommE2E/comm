// @flow

import {
  getBlobFetchableURL,
  holderFromBlobServiceURI,
  isBlobServiceURI,
} from 'lib/utils/blob-service.js';

function getCompatibleMediaURI(uri: string, ext: ?string): string {
  if (!ext) {
    return uri;
  }
  if (!uri.startsWith('ph://') && !uri.startsWith('ph-upload://')) {
    return uri;
  }
  const photoKitLocalIdentifier = uri.split('/')[2];
  if (!photoKitLocalIdentifier) {
    return uri;
  }
  // While the ph:// scheme is a Facebook hack used by FBMediaKit, the
  // assets-library:// scheme is a legacy Apple identifier. We map to the former
  // because:
  // (1) Some libraries (namely react-native-video) don't know how to handle the
  //     ph:// scheme yet
  // (2) In RN0.60, uploading ph:// JPEGs leads to recompression and often
  //     increases file size! It has the nice side effect of rotating image data
  //     based on EXIF orientation, but this isn't worth it for us
  // https://github.com/facebook/react-native/issues/27099#issuecomment-602016225
  // https://github.com/expo/expo/issues/3177
  // https://github.com/react-native-community/react-native-video/issues/1572
  return (
    `assets-library://asset/asset.${ext}` +
    `?id=${photoKitLocalIdentifier}&ext=${ext}`
  );
}

const mediaLibraryIdentifierRegex = new RegExp(
  '^assets-library:\\/\\/asset\\/asset.[a-z0-9]+\\?id=([a-z0-9-]+)',
  'i',
);
function getMediaLibraryIdentifier(inputURI: string): ?string {
  const uri = getCompatibleMediaURI(inputURI);
  const matches = uri.match(mediaLibraryIdentifierRegex);
  if (!matches) {
    return null;
  }
  return matches[1];
}

function getFetchableURI(inputURI: string): string {
  if (isBlobServiceURI(inputURI)) {
    const holder = holderFromBlobServiceURI(inputURI);
    return getBlobFetchableURL(holder);
  }

  // React Native always resolves Apple's assets-library:// and FBMediaKit's
  // ph:// scheme as an image so that the Image component can render thumbnails
  // of videos. In order to force fetch() to return a blob of the video, we need
  // to use the ph-upload:// scheme. https://git.io/Jerlh
  let uri = inputURI;
  if (uri.startsWith('assets-library://')) {
    const mediaNativeID = getMediaLibraryIdentifier(uri);
    if (mediaNativeID) {
      uri = `ph-upload://${mediaNativeID}/L0/001`;
    }
  }
  if (uri.startsWith('ph://')) {
    uri = uri.replace(/^ph:/, 'ph-upload:');
  }
  return uri;
}

export { getCompatibleMediaURI, getMediaLibraryIdentifier, getFetchableURI };
