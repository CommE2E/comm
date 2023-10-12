// @flow

import invariant from 'invariant';
import * as React from 'react';

import { fetchableMediaURI } from 'lib/media/media-utils.js';
import type {
  EncryptedMediaType,
  MediaType,
  Dimensions,
} from 'lib/types/media-types.js';

import EncryptedMultimedia from './encrypted-multimedia.react.js';
import LoadableVideo from './loadable-video.react.js';
import { usePlaceholder } from './media-utils.js';
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
  const { media } = props;

  const thumbHashEncryptionKey =
    media.thumbnailEncryptionKey ?? media.encryptionKey;

  const placeholderImage = usePlaceholder(
    media.thumbHash,
    thumbHashEncryptionKey,
  );

  const [dimensions, setDimensions] = React.useState<?Dimensions>(null);

  const mediaModalItem = React.useMemo(() => {
    if (media.type === 'photo') {
      const uri = fetchableMediaURI(media.uri);
      const style = {
        backgroundImage: placeholderImage
          ? `url(${placeholderImage})`
          : undefined,
      };

      return <img src={uri} style={style} />;
    }

    if (media.type === 'video') {
      const uri = fetchableMediaURI(media.uri);

      const { thumbnailURI } = media;
      invariant(thumbnailURI, 'video missing thumbnail');

      return (
        <LoadableVideo
          uri={uri}
          thumbnailSource={{ thumbnailURI }}
          thumbHashDataURL={placeholderImage}
        />
      );
    }

    invariant(
      media.type === 'encrypted_photo' || media.type === 'encrypted_video',
      'invalid media type',
    );

    const {
      type,
      blobURI,
      encryptionKey,
      thumbnailBlobURI,
      thumbnailEncryptionKey,
    } = media;

    const contentDimensions = dimensions ?? media.dimensions;
    const elementStyle = contentDimensions
      ? {
          width: `${contentDimensions.width}px`,
          height: `${contentDimensions.height}px`,
        }
      : undefined;

    return (
      <EncryptedMultimedia
        type={type}
        blobURI={blobURI}
        encryptionKey={encryptionKey}
        thumbnailBlobURI={thumbnailBlobURI}
        thumbnailEncryptionKey={thumbnailEncryptionKey}
        placeholderSrc={placeholderImage}
        elementStyle={elementStyle}
      />
    );
  }, [dimensions, media, placeholderImage]);

  return (
    <FullScreenViewModal
      contentDimensions={dimensions}
      setContentDimensions={setDimensions}
    >
      {mediaModalItem}
    </FullScreenViewModal>
  );
}

export default MultimediaModal;
