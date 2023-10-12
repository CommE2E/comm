// @flow

import * as React from 'react';

import type {
  EncryptedMediaType,
  MediaType,
  Dimensions,
} from 'lib/types/media-types.js';

import FullScreenViewModal from '../modals/full-screen-view-modal.react.js';

type MediaInfo =
  | {
      +type: MediaType,
      +uri: string,
      +dimensions: ?Dimensions,
      +thumbHash: ?string,
      +thumbnailURI: ?string,
    }
  | {
      +type: EncryptedMediaType,
      +blobURI: string,
      +encryptionKey: string,
      +dimensions: ?Dimensions,
      +thumbHash: ?string,
      +thumbnailBlobURI: ?string,
      +thumbnailEncryptionKey: ?string,
    };

type Props = {
  +media: MediaInfo,
};

function MultimediaModal(props: Props): React.Node {
  return <FullScreenViewModal {...props} />;
}

export default MultimediaModal;
