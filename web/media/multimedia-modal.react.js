// @flow

import invariant from 'invariant';
import * as React from 'react';
import { XCircle as XCircleIcon } from 'react-feather';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { EncryptedMediaType, MediaType } from 'lib/types/media-types.js';

import EncryptedMultimedia from './encrypted-multimedia.react.js';
import css from './media.css';

type MediaInfo =
  | {
      +type: MediaType,
      +uri: string,
    }
  | {
      +type: EncryptedMediaType,
      +holder: string,
      +encryptionKey: string,
    };

type BaseProps = {
  +media: MediaInfo,
};

type Props = {
  ...BaseProps,
  +popModal: (modal: ?React.Node) => void,
};

class MultimediaModal extends React.PureComponent<Props> {
  overlay: ?HTMLDivElement;

  componentDidMount() {
    invariant(this.overlay, 'overlay ref unset');
    this.overlay.focus();
  }

  render(): React.Node {
    let mediaModalItem;
    const { media } = this.props;
    if (media.type === 'photo') {
      mediaModalItem = <img src={media.uri} />;
    } else if (media.type === 'video') {
      mediaModalItem = (
        <video controls>
          <source src={media.uri} />
        </video>
      );
    } else {
      invariant(
        media.type === 'encrypted_photo' || media.type === 'encrypted_video',
        'invalid media type',
      );
      const { type, holder, encryptionKey } = media;
      mediaModalItem = (
        <EncryptedMultimedia
          type={type}
          holder={holder}
          encryptionKey={encryptionKey}
        />
      );
    }

    return (
      <div
        className={css.multimediaModalOverlay}
        ref={this.overlayRef}
        onClick={this.onBackgroundClick}
        tabIndex={0}
        onKeyDown={this.onKeyDown}
      >
        {mediaModalItem}
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
}

function ConnectedMultiMediaModal(props: BaseProps): React.Node {
  const modalContext = useModalContext();

  return <MultimediaModal {...props} popModal={modalContext.popModal} />;
}

export default ConnectedMultiMediaModal;
