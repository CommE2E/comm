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

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { fetchableMediaURI } from 'lib/media/media-utils.js';
import type { MediaType, EncryptedMediaType } from 'lib/types/media-types.js';

import EncryptedMultimedia from './encrypted-multimedia.react.js';
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

type Props = {
  +mediaSource: MediaSource,
  +pendingUpload?: ?PendingMultimediaUpload,
  +remove?: (uploadID: string) => void,
  +multimediaCSSClass: string,
  +multimediaImageCSSClass: string,
};

function Multimedia(props: Props): React.Node {
  const { mediaSource, pendingUpload } = props;
  const prevPropsRef = React.useRef({ mediaSource, pendingUpload });
  React.useEffect(() => {
    const prevProps = prevPropsRef.current;
    prevPropsRef.current = { mediaSource, pendingUpload };

    if (
      prevProps.mediaSource.type === 'encrypted_photo' ||
      prevProps.mediaSource.type === 'encrypted_video'
    ) {
      return;
    }

    const prevUri = prevProps.mediaSource.uri;
    if (!prevUri || mediaSource.uri === prevUri) {
      return;
    }
    if (
      (!pendingUpload || pendingUpload.uriIsReal) &&
      (!prevProps.pendingUpload || !prevProps.pendingUpload.uriIsReal)
    ) {
      URL.revokeObjectURL(prevUri);
    }
  }, [mediaSource, pendingUpload]);

  const { remove: removeProp } = props;
  const handleRemove = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.stopPropagation();
      invariant(
        removeProp && pendingUpload,
        'Multimedia cannot be removed as either remove or pendingUpload ' +
          'are unspecified',
      );
      removeProp(pendingUpload.localID);
    },
    [removeProp, pendingUpload],
  );

  const { pushModal } = useModalContext();
  const handleClick = React.useCallback(() => {
    let media;
    if (
      mediaSource.type === 'encrypted_photo' ||
      mediaSource.type === 'encrypted_video'
    ) {
      const { type, holder, encryptionKey } = mediaSource;
      media = { type, holder, encryptionKey };
    } else {
      const { type, uri } = mediaSource;
      invariant(uri, 'uri is missing for media modal');
      media = { type, uri };
    }
    pushModal(<MultimediaModal media={media} />);
  }, [pushModal, mediaSource]);

  let progressIndicator, errorIndicator, removeButton;

  const { multimediaImageCSSClass, multimediaCSSClass } = props;
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

    if (removeProp) {
      removeButton = (
        <Button onClick={handleRemove}>
          <XCircleIcon className={css.removeUpload} />
        </Button>
      );
    }
  }

  const imageContainerClasses = [css.multimediaImage, multimediaImageCSSClass];
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
    const { type, holder, encryptionKey } = mediaSource;
    mediaElement = (
      <EncryptedMultimedia
        type={type}
        holder={holder}
        encryptionKey={encryptionKey}
      />
    );
  }

  // Media node is the container for the media element (button if photo)
  let mediaNode;
  if (mediaSource.type === 'photo' || mediaSource.type === 'encrypted_photo') {
    mediaNode = (
      <Button
        className={classNames(imageContainerClasses)}
        onClick={handleClick}
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

export default Multimedia;
