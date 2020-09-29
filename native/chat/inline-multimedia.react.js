// @flow

import { type MediaInfo, mediaInfoPropType } from 'lib/types/media-types';
import {
  type PendingMultimediaUpload,
  pendingMultimediaUploadPropType,
} from '../input/input-state';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import * as Progress from 'react-native-progress';

import Multimedia from '../media/multimedia.react';
import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react';

type Props = {|
  mediaInfo: MediaInfo,
  onPress: () => void,
  onLongPress: () => void,
  postInProgress: boolean,
  pendingUpload: ?PendingMultimediaUpload,
  spinnerColor: string,
|};
class InlineMultimedia extends React.PureComponent<Props> {
  static propTypes = {
    mediaInfo: mediaInfoPropType.isRequired,
    onPress: PropTypes.func.isRequired,
    onLongPress: PropTypes.func.isRequired,
    postInProgress: PropTypes.bool.isRequired,
    pendingUpload: pendingMultimediaUploadPropType,
    spinnerColor: PropTypes.string.isRequired,
  };

  render() {
    const { mediaInfo, pendingUpload, postInProgress } = this.props;

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
            formatText={this.formatProgressText}
          />
        </View>
      );
    }

    return (
      <GestureTouchableOpacity
        onPress={this.props.onPress}
        onLongPress={this.props.onLongPress}
        style={styles.expand}
      >
        <Multimedia
          mediaInfo={mediaInfo}
          spinnerColor={this.props.spinnerColor}
        />
        {progressIndicator}
      </GestureTouchableOpacity>
    );
  }

  formatProgressText = (progress: number) => `${Math.floor(progress * 100)}%`;
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
