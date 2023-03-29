// @flow

import { Image } from 'expo-image';
import * as React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import type { ImageSource } from 'react-native/Libraries/Image/ImageSource';

import type { ImageStyle } from '../types/styles.js';

type Props = {
  +source: ?ImageSource,
  +onLoad: () => void,
  +spinnerColor: string,
  +style: ImageStyle,
  +invisibleLoad: boolean,
};
function LoadableImage(props: Props): React.Node {
  const { source, onLoad: onLoadProp } = props;

  const [loaded, setLoaded] = React.useState(false);

  const onLoad = React.useCallback(() => {
    setLoaded(true);
    onLoadProp && onLoadProp();
  }, [onLoadProp]);

  if (source && loaded) {
    return <Image source={source} onLoad={onLoad} style={props.style} />;
  }

  if (props.invisibleLoad) {
    return (
      <Image
        source={source}
        onLoad={onLoad}
        style={[props.style, styles.invisible]}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.spinnerContainer}>
        <ActivityIndicator color={props.spinnerColor} size="large" />
      </View>
      <Image source={source} onLoad={onLoad} style={props.style} />
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

export default LoadableImage;
