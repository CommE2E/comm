// @flow

import invariant from 'invariant';
import * as React from 'react';
import 'react-circular-progressbar/dist/styles.css';
import { AlertCircle as AlertCircleIcon } from 'react-feather';

import type { EncryptedMediaType } from 'lib/types/media-types.js';

import { useFetchAndDecryptMedia } from './encryption-utils.js';
import LoadableVideo from './loadable-video.react.js';
import css from './media.css';
import LoadingIndicator from '../loading-indicator.react.js';
import type { CSSStyle } from '../types/styles';

type Props = {
  +blobURI: string,
  +encryptionKey: string,
  +type: EncryptedMediaType,
  +thumbnailBlobURI?: ?string,
  +thumbnailEncryptionKey?: ?string,
  +placeholderSrc?: ?string,
  +multimediaClassName?: string,
  +elementStyle?: ?Partial<CSSStyle>,
  // if provided, this component will be shown instead of the loading indicator
  +loadingIndicatorComponent?: React.Node,
  // if true, the loading indicator will not be shown
  +invisibleLoad?: boolean,
};

type Source = { +uri: string } | { +error: string };

function EncryptedMultimedia(props: Props): React.Node {
  const {
    blobURI,
    encryptionKey,
    placeholderSrc,
    elementStyle,
    multimediaClassName,
    invisibleLoad,
  } = props;

  const [source, setSource] = React.useState<?Source>(null);
  const videoRef = React.useRef<?HTMLVideoElement>(null);

  const fetchAndDecryptMedia = useFetchAndDecryptMedia();

  React.useEffect(() => {
    let isMounted = true,
      uriToDispose;
    setSource(null);

    const loadDecrypted = async () => {
      const { result } = await fetchAndDecryptMedia(blobURI, encryptionKey);
      if (!isMounted) {
        return;
      }

      if (result.success) {
        const { uri } = result;
        setSource({ uri });
        uriToDispose = uri;
      } else {
        setSource({ error: result.reason });
      }
    };

    void loadDecrypted();

    return () => {
      isMounted = false;
      if (uriToDispose) {
        URL.revokeObjectURL(uriToDispose);
      }
    };
  }, [blobURI, encryptionKey, fetchAndDecryptMedia]);

  // we need to update the video source when the source changes
  // because re-rendering the <source> element wouldn't reload parent <video>
  React.useEffect(() => {
    if (videoRef.current && source?.uri) {
      videoRef.current.src = source.uri;
      videoRef.current.load();
    }
  }, [source]);

  let loadingIndicator, errorIndicator;

  if (!source && !invisibleLoad) {
    loadingIndicator = props.loadingIndicatorComponent ?? (
      <div className={css.loadingIndicatorContainer}>
        <LoadingIndicator
          status="loading"
          size="large"
          color="white"
          loadingClassName={css.loadingIndicator}
        />
      </div>
    );
  }

  if (source?.error) {
    errorIndicator = <AlertCircleIcon className={css.uploadError} size={36} />;
  }

  let mediaNode;
  if (props.type === 'encrypted_photo') {
    mediaNode = (
      <img
        src={source?.uri ?? placeholderSrc}
        key={blobURI}
        className={multimediaClassName}
        style={elementStyle}
      />
    );
  } else {
    const { thumbnailBlobURI, thumbnailEncryptionKey } = props;
    invariant(
      thumbnailBlobURI && thumbnailEncryptionKey,
      'Thumbnail missing for encrypted video',
    );

    mediaNode = (
      <LoadableVideo
        uri={null}
        ref={videoRef}
        key={blobURI}
        thumbnailSource={{ thumbnailBlobURI, thumbnailEncryptionKey }}
        elementStyle={elementStyle}
        thumbHashDataURL={placeholderSrc}
        multimediaClassName={multimediaClassName}
      />
    );
  }

  return (
    <>
      {mediaNode}
      {loadingIndicator}
      {errorIndicator}
    </>
  );
}

export default EncryptedMultimedia;
