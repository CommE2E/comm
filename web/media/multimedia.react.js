// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  XCircle as XCircleIcon,
  AlertCircle as AlertCircleIcon,
} from 'react-feather';

import {
  useModalContext,
  type PushModal,
} from 'lib/components/modal-provider.react.js';
import type { MediaType, EncryptedMediaType } from 'lib/types/media-types.js';

import EncryptedMultimedia from './encrypted-multimedia.react.js';
import { fetchableMediaURI } from './media-utils.js';
import css from './media.css';
import MultimediaModal from './multimedia-modal.react.js';
import Button from '../components/button.react.js';
import { type PendingMultimediaUpload } from '../input/input-state.js';

type MediaSource =
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
  +mediaSource: MediaSource,
  +pendingUpload?: ?PendingMultimediaUpload,
  +remove?: (uploadID: string) => void,
  +multimediaCSSClass: string,
  +multimediaImageCSSClass: string,
};
type Props = {
  ...BaseProps,
  +pushModal: PushModal,
};

class Multimedia extends React.PureComponent<Props> {
  componentDidUpdate(prevProps: Props) {
    const { mediaSource, pendingUpload } = this.props;
    if (
      prevProps.mediaSource.type === 'encrypted_photo' ||
      prevProps.mediaSource.type === 'encrypted_video'
    ) {
      return;
    }

    const prevUri = prevProps.mediaSource?.uri;
    if (!prevUri || mediaSource.uri === prevUri) {
      return;
    }
    if (
      (!pendingUpload || pendingUpload.uriIsReal) &&
      (!prevProps.pendingUpload || !prevProps.pendingUpload.uriIsReal)
    ) {
      URL.revokeObjectURL(prevUri);
    }
  }

  render(): React.Node {
    let progressIndicator, errorIndicator, removeButton;

    const {
      pendingUpload,
      remove,
      mediaSource,
      multimediaImageCSSClass,
      multimediaCSSClass,
    } = this.props;
    if (pendingUpload) {
      const { progressPercent, failed } = pendingUpload;

      if (progressPercent !== 0 && progressPercent !== 1) {
        const outOfHundred = Math.floor(progressPercent * 100);
        const text = `${outOfHundred}%`;
        progressIndicator = (
          <CircularProgressbar
            value={outOfHundred}
            text={text}
            background
            backgroundPadding={6}
            className={css.progressIndicator}
          />
        );
      }

      if (failed) {
        errorIndicator = (
          <AlertCircleIcon className={css.uploadError} size={36} />
        );
      }

      if (remove) {
        removeButton = (
          <Button onClick={this.remove}>
            <XCircleIcon className={css.removeUpload} />
          </Button>
        );
      }
    }

    const imageContainerClasses = [
      css.multimediaImage,
      multimediaImageCSSClass,
    ];
    imageContainerClasses.push(css.clickable);

    // Media element is the actual image or video element (or encrypted version)
    let mediaElement;
    if (mediaSource.type === 'photo') {
      const uri = fetchableMediaURI(mediaSource.uri);
      mediaElement = <img src={uri} />;
    } else if (mediaSource.type === 'video') {
      const uri = fetchableMediaURI(mediaSource.uri);
      mediaElement = (
        <video controls>
          <source src={uri} />
        </video>
      );
    } else if (
      mediaSource.type === 'encrypted_photo' ||
      mediaSource.type === 'encrypted_video'
    ) {
      const { ...encryptedMediaProps } = mediaSource;
      mediaElement = <EncryptedMultimedia {...encryptedMediaProps} />;
    }

    // Media node is the container for the media element (button if photo)
    let mediaNode;
    if (
      mediaSource.type === 'photo' ||
      mediaSource.type === 'encrypted_photo'
    ) {
      mediaNode = (
        <Button
          className={classNames(imageContainerClasses)}
          onClick={this.onClick}
        >
          {mediaElement}
          {removeButton}
        </Button>
      );
    } else {
      mediaNode = (
        <div className={classNames(imageContainerClasses)}>{mediaElement}</div>
      );
    }

    const containerClasses = [css.multimedia, multimediaCSSClass];
    return (
      <span className={classNames(containerClasses)}>
        {mediaNode}
        {progressIndicator}
        {errorIndicator}
      </span>
    );
  }

  remove: (event: SyntheticEvent<HTMLElement>) => void = event => {
    event.stopPropagation();
    const { remove, pendingUpload } = this.props;
    invariant(
      remove && pendingUpload,
      'Multimedia cannot be removed as either remove or pendingUpload ' +
        'are unspecified',
    );
    remove(pendingUpload.localID);
  };

  onClick: () => void = () => {
    const { pushModal, mediaSource } = this.props;
    pushModal(<MultimediaModal media={mediaSource} />);
  };
}

function ConnectedMultimediaContainer(props: BaseProps): React.Node {
  const modalContext = useModalContext();

  return <Multimedia {...props} pushModal={modalContext.pushModal} />;
}

export default ConnectedMultimediaContainer;
