// @flow

import invariant from 'invariant';
import * as React from 'react';
import { XCircle as XCircleIcon } from 'react-feather';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { fetchableMediaURI } from 'lib/media/media-utils.js';
import type {
  EncryptedMediaType,
  MediaType,
  Dimensions,
} from 'lib/types/media-types.js';

import EncryptedMultimedia from './encrypted-multimedia.react.js';
import LoadableVideo from './loadable-video.react.js';
import { usePlaceholder } from './media-utils.js';
import css from './media.css';

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

type BaseProps = {
  +media: MediaInfo,
};

type Props = {
  ...BaseProps,
  +popModal: (modal: ?React.Node) => void,
  +placeholderImage: ?string,
};

type State = {
  +dimensions: ?Dimensions,
};

class MultimediaModal extends React.PureComponent<Props, State> {
  overlay: ?HTMLDivElement;

  constructor(props: Props) {
    super(props);
    this.state = { dimensions: null };
  }

  componentDidMount() {
    invariant(this.overlay, 'overlay ref unset');
    this.overlay.focus();
    this.calculateMediaDimensions();
    window.addEventListener('resize', this.calculateMediaDimensions);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.calculateMediaDimensions);
  }

  render(): React.Node {
    let mediaModalItem;
    const { media, placeholderImage } = this.props;
    const style = {
      backgroundImage: placeholderImage
        ? `url(${placeholderImage})`
        : undefined,
    };
    if (media.type === 'photo') {
      const uri = fetchableMediaURI(media.uri);
      mediaModalItem = <img src={uri} style={style} />;
    } else if (media.type === 'video') {
      const uri = fetchableMediaURI(media.uri);
      const { thumbnailURI } = media;
      invariant(thumbnailURI, 'video missing thumbnail');
      mediaModalItem = (
        <LoadableVideo
          uri={uri}
          thumbnailSource={{ thumbnailURI }}
          thumbHashDataURL={placeholderImage}
        />
      );
    } else {
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
      const dimensions = this.state.dimensions ?? media.dimensions;
      const elementStyle = dimensions
        ? {
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
          }
        : undefined;
      mediaModalItem = (
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
    }

    return (
      <div
        className={css.multimediaModalOverlay}
        onClick={this.onBackgroundClick}
      >
        <div
          ref={this.overlayRef}
          className={css.mediaContainer}
          tabIndex={0}
          onKeyDown={this.onKeyDown}
        >
          {mediaModalItem}
        </div>
        <XCircleIcon
          onClick={this.props.popModal}
          className={css.closeMultimediaModal}
        />
      </div>
    );
  }

  overlayRef: (overlay: ?HTMLDivElement) => void = overlay => {
    this.overlay = overlay;
  };

  onBackgroundClick: (event: SyntheticEvent<HTMLDivElement>) => void =
    event => {
      if (event.target === this.overlay) {
        this.props.popModal();
      }
    };

  onKeyDown: (event: SyntheticKeyboardEvent<HTMLDivElement>) => void =
    event => {
      if (event.key === 'Escape') {
        this.props.popModal();
      }
    };

  calculateMediaDimensions: () => void = () => {
    if (!this.overlay || !this.props.media.dimensions) {
      return;
    }
    const containerWidth = this.overlay.clientWidth;
    const containerHeight = this.overlay.clientHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    const { width: mediaWidth, height: mediaHeight } =
      this.props.media.dimensions;
    const mediaAspectRatio = mediaWidth / mediaHeight;

    let newWidth, newHeight;
    if (containerAspectRatio > mediaAspectRatio) {
      newWidth = Math.min(mediaWidth, containerHeight * mediaAspectRatio);
      newHeight = newWidth / mediaAspectRatio;
    } else {
      newHeight = Math.min(mediaHeight, containerWidth / mediaAspectRatio);
      newWidth = newHeight * mediaAspectRatio;
    }
    this.setState({
      dimensions: {
        width: newWidth,
        height: newHeight,
      },
    });
  };
}

function ConnectedMultiMediaModal(props: BaseProps): React.Node {
  const modalContext = useModalContext();
  const { thumbHash, encryptionKey, thumbnailEncryptionKey } = props.media;
  const thumbHashEncryptionKey = thumbnailEncryptionKey ?? encryptionKey;
  const placeholderImage = usePlaceholder(thumbHash, thumbHashEncryptionKey);

  return (
    <MultimediaModal
      {...props}
      popModal={modalContext.popModal}
      placeholderImage={placeholderImage}
    />
  );
}

export default ConnectedMultiMediaModal;
