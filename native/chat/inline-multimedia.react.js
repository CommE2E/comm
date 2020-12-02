// @flow

import type { MediaInfo } from 'lib/types/media-types';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import * as Progress from 'react-native-progress';
import Icon from 'react-native-vector-icons/Feather';

import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react';
import type { PendingMultimediaUpload } from '../input/input-state';
import { KeyboardContext } from '../keyboard/keyboard-state';
import Multimedia from '../media/multimedia.react';

const formatProgressText = (progress: number) =>
  `${Math.floor(progress * 100)}%`;

type Props = {|
  +mediaInfo: MediaInfo,
  +onPress: () => void,
  +onLongPress: () => void,
  +postInProgress: boolean,
  +pendingUpload: ?PendingMultimediaUpload,
  +spinnerColor: string,
|};
function InlineMultimedia(props: Props) {
  const { mediaInfo, pendingUpload, postInProgress } = props;

  let failed = mediaInfo.id.startsWith('localUpload') && !postInProgress;
  let progressPercent = 1;
  if (pendingUpload) {
    ({ progressPercent, failed } = pendingUpload);
  }

  let progressIndicator;
  if (failed) {
    progressIndicator = (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle" style={styles.uploadError} size={64} />
      </View>
    );
  } else if (progressPercent !== 1) {
    progressIndicator = (
      <View style={styles.centerContainer}>
        <Progress.Circle
          size={100}
          indeterminate={progressPercent === 0}
          progress={progressPercent}
          borderWidth={5}
          fill="#DDDDDD"
          unfilledColor="#DDDDDD"
          color="#88BB88"
          thickness={15}
          showsText={true}
          textStyle={styles.progressIndicatorText}
          formatText={formatProgressText}
        />
      </View>
    );
  }

  const keyboardState = React.useContext(KeyboardContext);
  const keyboardShowing = keyboardState?.keyboardShowing;

  return (
    <GestureTouchableOpacity
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      disabled={keyboardShowing}
      style={styles.expand}
    >
      <Multimedia mediaInfo={mediaInfo} spinnerColor={props.spinnerColor} />
      {progressIndicator}
    </GestureTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  expand: {
    flex: 1,
  },
  progressIndicatorText: {
    color: 'black',
    fontSize: 21,
  },
  uploadError: {
    color: 'white',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default InlineMultimedia;
