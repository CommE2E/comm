// @flow

import invariant from 'invariant';
import * as React from 'react';

import { fetchableMediaURI } from 'lib/media/media-utils.js';

import EncryptedMultimedia from '../../../media/encrypted-multimedia.react.js';
import { usePlaceholder } from '../../../media/media-utils.js';

type MediaSource =
  | {
      +kind: 'plain',
      +uri: string,
      +thumbHash: ?string,
    }
  | {
      +kind: 'encrypted',
      +blobURI: string,
      +encryptionKey: string,
      +thumbHash: ?string,
    };
type Props = {
  +imageSource: MediaSource,
  +imageCSSClass: string,
  +imageContainerCSSClass: string,
  +onClick?: () => void,
};
function MediaGalleryItem(props: Props) {
  const { imageSource, imageCSSClass, imageContainerCSSClass } = props;

  const { thumbHash, encryptionKey } = imageSource;
  const placeholderImage = usePlaceholder(thumbHash, encryptionKey);
  const imageStyle = React.useMemo(
    () => ({
      background: placeholderImage
        ? `center / cover url(${placeholderImage})`
        : undefined,
    }),
    [placeholderImage],
  );

  let image;
  if (imageSource.kind === 'plain') {
    const uri = fetchableMediaURI(imageSource.uri);
    image = <img src={uri} className={imageCSSClass} style={imageStyle} />;
  } else if (imageSource.kind === 'encrypted') {
    const { blobURI } = imageSource;
    invariant(encryptionKey, 'encryptionKey undefined for encrypted image');
    image = (
      <EncryptedMultimedia
        type="encrypted_photo"
        blobURI={blobURI}
        encryptionKey={encryptionKey}
        placeholderSrc={placeholderImage}
        multimediaClassName={imageCSSClass}
      />
    );
  }

  return (
    <div className={imageContainerCSSClass} onClick={props.onClick}>
      {image}
    </div>
  );
}

const MemoizedItem: React.ComponentType<Props> =
  React.memo<Props, void>(MediaGalleryItem);

export default MemoizedItem;
