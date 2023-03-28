// @flow

import { Image } from 'expo-image';
import * as React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

import { decryptMedia } from './encryption-utils.js';
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

  const connectionStatus = useSelector(state => state.connection.status);
  const [prevConnectionStatus, setPrevConnectionStatus] =
    React.useState(connectionStatus);
  const [attempt, setAttempt] = React.useState(0);

  const [source, setSource] = React.useState(null);

  if (connectionStatus !== prevConnectionStatus) {
    // attempt reload after connection is restored
    if (!source && connectionStatus === 'connected') {
      setAttempt(it => it + 1);
    }
    setPrevConnectionStatus(connectionStatus);
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

  if (source) {
    return (
      <Image
        source={source}
        onLoad={onLoad}
        style={props.style}
        key={attempt}
      />
    );
  }
  if (props.invisibleLoad) {
    return (
      <Image
        source={source}
        onLoad={onLoad}
        style={[props.style, styles.invisible]}
        key={attempt}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.spinnerContainer}>
        <ActivityIndicator color={props.spinnerColor} size="large" />
      </View>
      <Image
        source={source}
        onLoad={onLoad}
        style={props.style}
        key={attempt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  invisible: {
    opacity: 0,
  },
  spinnerContainer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

export default EncryptedImage;
