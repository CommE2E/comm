// @flow

import * as React from 'react';

import { decryptMedia } from './encryption-utils.js';
import LoadableImage from './loadable-image.react.js';
import { useSelector } from '../redux/redux-utils.js';
import type { ImageStyle } from '../types/styles.js';

type BaseProps = {
  +holder: string,
  +encryptionKey: string,
  +onLoad: (uri: string) => void,
  +spinnerColor: string,
  +style: ImageStyle,
  +invisibleLoad: boolean,
};
type Props = {
  ...BaseProps,
};

function EncryptedImage(props: Props): React.Node {
  const { holder, encryptionKey, onLoad: onLoadProp } = props;

  const [source, setSource] = React.useState(null);

  const connectionStatus = useSelector(state => state.connection.status);
  const prevConnectionStatusRef = React.useRef(connectionStatus);
  const [attempt, setAttempt] = React.useState(0);

  if (prevConnectionStatusRef.current !== connectionStatus) {
    if (!source && connectionStatus === 'connected') {
      setAttempt(attempt + 1);
    }
    prevConnectionStatusRef.current = connectionStatus;
  }

  React.useEffect(() => {
    let isMounted = true;
    setSource(null);

    const loadDecrypted = async () => {
      const { result } = await decryptMedia(holder, encryptionKey, {
        destination: 'data_uri',
      });
      // TODO: decide what to do if decryption fails
      if (result.success && isMounted) {
        setSource({ uri: result.uri });
      }
    };

    loadDecrypted();

    return () => {
      isMounted = false;
    };
  }, [attempt, holder, encryptionKey]);

  const onLoad = React.useCallback(() => {
    onLoadProp && onLoadProp(holder);
  }, [holder, onLoadProp]);

  const { style, spinnerColor, invisibleLoad } = props;

  return (
    <LoadableImage
      source={source}
      onLoad={onLoad}
      spinnerColor={spinnerColor}
      style={style}
      invisibleLoad={invisibleLoad}
      key={attempt}
    />
  );
}

export default EncryptedImage;
