// @flow

import * as React from 'react';
import 'react-circular-progressbar/dist/styles.css';
import { AlertCircle as AlertCircleIcon } from 'react-feather';

import type { EncryptedMediaType } from 'lib/types/media-types.js';

import { decryptMedia } from './encryption-utils.js';
import css from './media.css';
import LoadingIndicator from '../loading-indicator.react.js';

type Props = {
  +holder: string,
  +encryptionKey: string,
  +type: EncryptedMediaType,
};

function EncryptedMultimedia(props: Props): React.Node {
  const { holder, encryptionKey } = props;

  const [source, setSource] = React.useState(null);
  const videoRef = React.useRef(null);

  React.useEffect(() => {
    let isMounted = true,
      uriToDispose;
    setSource(null);

    const loadDecrypted = async () => {
      const { result } = await decryptMedia(holder, encryptionKey);
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

    loadDecrypted();

    return () => {
      isMounted = false;
      if (uriToDispose) {
        URL.revokeObjectURL(uriToDispose);
      }
    };
  }, [holder, encryptionKey]);

  // we need to update the video source when the source changes
  // because re-rendering the <source> element wouldn't reload parent <video>
  React.useEffect(() => {
    if (videoRef.current && source?.uri) {
      videoRef.current.src = source.uri;
      videoRef.current.load();
    }
  }, [source]);

  let loadingIndicator, errorIndicator;

  if (!source) {
    loadingIndicator = (
      <LoadingIndicator
        status="loading"
        size="large"
        color="white"
        loadingClassName={css.loadingIndicator}
      />
    );
  }

  if (source?.error) {
    errorIndicator = <AlertCircleIcon className={css.uploadError} size={36} />;
  }

  let mediaNode;
  if (props.type === 'encrypted_photo') {
    mediaNode = <img src={source?.uri} key={holder} />;
  } else {
    mediaNode = <video controls ref={videoRef} key={holder} />;
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
