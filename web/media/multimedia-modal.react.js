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

  const photo = React.useMemo(() => {
    if (media.type !== 'photo') {
      return null;
    }
    const uri = fetchableMediaURI(media.uri);
    const style = {
      backgroundImage: placeholderImage
        ? `url(${placeholderImage})`
        : undefined,
    };

    return <img src={uri} style={style} />;
  }, [media.type, media.uri, placeholderImage]);

  const video = React.useMemo(() => {
    if (media.type !== 'video') {
      return null;
    }

    const uri = fetchableMediaURI(media.uri);

    const { thumbnailURI } = media;
    invariant(thumbnailURI, 'video missing thumbnail');

    return (
      <LoadableVideo
        uri={uri}
        thumbnailSource={{ thumbnailURI }}
        thumbHashDataURL={placeholderImage}
        dimensions={dimensions}
      />
    );
  }, [media, placeholderImage, dimensions]);

  const encryptedMultimedia = React.useMemo(() => {
    if (media.type !== 'encrypted_photo' && media.type !== 'encrypted_video') {
      return null;
    }

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

  const mediaModalItem = React.useMemo(() => {
    if (media.type === 'photo') {
      return photo;
    } else if (media.type === 'video') {
      return video;
    } else {
      return encryptedMultimedia;
    }
  }, [encryptedMultimedia, media.type, photo, video]);

  const multimediaModal = React.useMemo(
    () => (
      <FullScreenViewModal
        initialContentDimensions={media.dimensions}
        setDynamicContentDimensions={setDimensions}
      >
        {mediaModalItem}
      </FullScreenViewModal>
    ),
    [media.dimensions, mediaModalItem],
  );

  return multimediaModal;
}

export default MultimediaModal;
