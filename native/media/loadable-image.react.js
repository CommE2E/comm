// @flow

import Icon from '@expo/vector-icons/Feather.js';
import { Image } from 'expo-image';
import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';

import { useStyles } from '../themes/colors.js';
import type { ImageSource } from '../types/react-native.js';
import type { ImageStyle } from '../types/styles.js';

type Props = {
  +placeholder: ?ImageSource,
  +source: ?ImageSource,
  +onLoad?: () => void,
  +spinnerColor: string,
  +style: ImageStyle,
  +invisibleLoad: boolean,
  +errorOccurred?: boolean,
};

function LoadableImage(props: Props): React.Node {
  const { source, placeholder, onLoad: onLoadProp, errorOccurred } = props;
  const styles = useStyles(unboundStyles);

  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  const onError = React.useCallback(() => {
    setError(true);
  }, []);

  const onLoad = React.useCallback(() => {
    setError(false);
    setLoaded(true);
    onLoadProp && onLoadProp();
  }, [onLoadProp]);

  const invisibleStyle = React.useMemo(
    () => [props.style, styles.invisible],
    [props.style, styles.invisible],
  );

  if (!loaded && props.invisibleLoad) {
    return (
      <Image
        source={source}
        placeholder={placeholder}
        onLoad={onLoad}
        onError={onError}
        style={invisibleStyle}
      />
    );
  }

  let statusIndicator;
  if (error || errorOccurred) {
    statusIndicator = (
      <View style={styles.statusIndicatorContainer}>
        <Icon name="alert-circle" style={styles.errorIndicator} size={42} />
      </View>
    );
  } else if (!loaded) {
    statusIndicator = (
      <View style={styles.statusIndicatorContainer}>
        <ActivityIndicator color={props.spinnerColor} size="large" />
      </View>
    );
  }

  if (error) {
    statusIndicator = (
      <View style={styles.statusIndicatorContainer}>
        <Icon name="alert-circle" style={styles.errorIndicator} size={42} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={source}
        placeholder={placeholder}
        onLoad={onLoad}
        onError={onError}
        cachePolicy="memory-disk"
        style={props.style}
      />
      {statusIndicator}
    </View>
  );
}

const unboundStyles = {
  container: {
    flex: 1,
  },
  errorIndicator: {
    color: 'whiteText',
    backgroundColor: 'vibrantRedButton',
    borderRadius: 21,
    overflow: 'hidden',
  },
  invisible: {
    opacity: 0,
  },
  statusIndicatorContainer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
};

export default LoadableImage;
