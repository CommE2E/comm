// @flow

import Icon from '@expo/vector-icons/Feather.js';
import IonIcon from '@expo/vector-icons/Ionicons.js';
import * as React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import * as Progress from 'react-native-progress';
import tinycolor from 'tinycolor2';

import { isLocalUploadID } from 'lib/media/media-utils.js';
import type { MediaInfo } from 'lib/types/media-types.js';

import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react.js';
import type { PendingMultimediaUpload } from '../input/input-state.js';
import Multimedia from '../media/multimedia.react.js';

type Props = {
  +mediaInfo: MediaInfo,
  +onPress: () => void,
  +postInProgress: boolean,
  +pendingUpload: ?PendingMultimediaUpload,
  +spinnerColor: string,
};
function InlineMultimedia(props: Props): React.Node {
  const { mediaInfo, pendingUpload, postInProgress } = props;

  let failed = isLocalUploadID(mediaInfo.id) && !postInProgress;
  let progressPercent = 1;
  let processingStep;
  if (pendingUpload) {
    ({ progressPercent, failed, processingStep } = pendingUpload);
  }

  let progressIndicator;
  if (failed) {
    progressIndicator = (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle" style={styles.uploadError} size={64} />
      </View>
    );
  } else if (progressPercent !== 1) {
    const progressOverlay = (
      <View style={styles.progressOverlay}>
        <Text style={styles.progressPercentText}>
          {`${Math.floor(progressPercent * 100).toString()}%`}
        </Text>
        <Text style={styles.processingStepText}>
          {processingStep ? processingStep : 'pending'}
        </Text>
      </View>
    );

    const primaryColor = tinycolor(props.spinnerColor);
    const secondaryColor = primaryColor.isDark()
      ? primaryColor.lighten(20).toString()
      : primaryColor.darken(20).toString();

    const progressSpinnerProps = {
      size: 120,
      indeterminate: progressPercent === 0,
      progress: progressPercent,
      fill: secondaryColor,
      unfilledColor: secondaryColor,
      color: props.spinnerColor,
      thickness: 10,
      borderWidth: 0,
    };

    let progressSpinner;
    if (processingStep === 'transcoding') {
      progressSpinner = <Progress.Circle {...progressSpinnerProps} />;
    } else {
      progressSpinner = <Progress.Pie {...progressSpinnerProps} />;
    }

    progressIndicator = (
      <View style={styles.centerContainer}>
        {progressSpinner}
        {progressOverlay}
      </View>
    );
  }

  let playButton;
  if (mediaInfo.type === 'video' || mediaInfo.type === 'encrypted_video') {
    playButton = (
      <View style={styles.centerContainer}>
        <IonIcon name="ios-play-circle" style={styles.playButton} size={80} />
      </View>
    );
  }

  return (
    <View style={styles.expand}>
      <GestureTouchableOpacity onPress={props.onPress} style={styles.expand}>
        <Multimedia mediaInfo={mediaInfo} spinnerColor={props.spinnerColor} />
        {progressIndicator ? progressIndicator : playButton}
      </GestureTouchableOpacity>
    </View>
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
  playButton: {
    color: 'white',
    opacity: 0.9,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  processingStepText: {
    color: 'white',
    fontSize: 12,
    textShadowColor: '#000',
    textShadowRadius: 1,
  },
  progressOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  progressPercentText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowRadius: 1,
  },
  uploadError: {
    color: 'white',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default InlineMultimedia;
