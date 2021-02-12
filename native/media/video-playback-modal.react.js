// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useState } from 'react';
import { View, Text, TouchableWithoutFeedback } from 'react-native';
import * as Progress from 'react-native-progress';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';

import Button from '../components/button.react';
import Modal from '../components/modal.react';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useStyles } from '../themes/colors';
import { formatDuration } from './video-utils';

export type VideoPlaybackModalParams = {|
  +videoUri: string,
|};

type Props = {|
  +navigation: AppNavigationProp<'VideoPlaybackModal'>,
  +route: NavigationRoute<'VideoPlaybackModal'>,
|};
function VideoPlaybackModal(props: Props) {
  const styles = useStyles(unboundStyles);

  const [paused, setPaused] = useState(false);
  const [percentElapsed, setPercentElapsed] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState('0:00');
  const [totalDuration, setTotalDuration] = useState('0:00');
  const videoRef = React.useRef();

  const {
    navigation,
    route: {
      params: { videoUri },
    },
  } = props;

  const togglePlayback = React.useCallback(() => {
    setPaused(!paused);
  }, [paused]);

  const togglePlaybackControls = React.useCallback(() => {
    setControlsVisible(!controlsVisible);
  }, [controlsVisible]);

  const resetVideo = React.useCallback(() => {
    invariant(videoRef.current, 'videoRef.current should be set in resetVideo');
    videoRef.current.seek(0);
  }, []);

  const progressCallback = React.useCallback((res) => {
    setTimeElapsed(formatDuration(res.currentTime));
    setTotalDuration(formatDuration(res.seekableDuration));
    setPercentElapsed(
      Math.ceil((res.currentTime / res.seekableDuration) * 100),
    );
  }, []);

  let controls;
  if (controlsVisible) {
    controls = (
      <>
        <View style={styles.header}>
          <View style={styles.closeButton}>
            <Button onPress={navigation.goBackOnce}>
              <Icon name="close" size={30} style={styles.iconButton} />
            </Button>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.playPauseButton}>
            <TouchableWithoutFeedback onPress={togglePlayback}>
              <Icon
                name={paused ? 'play' : 'pause'}
                size={28}
                style={styles.iconButton}
              />
            </TouchableWithoutFeedback>

            <View style={styles.progressBar}>
              <Progress.Bar
                progress={percentElapsed / 100}
                height={4}
                width={260}
                color={styles.progressBar.color}
              />
            </View>

            <Text style={styles.durationText}>
              {timeElapsed} / {totalDuration}
            </Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <Modal
      modalStyle={styles.modal}
      navigation={navigation}
      safeAreaEdges={['left']}
    >
      <TouchableWithoutFeedback onPress={togglePlaybackControls}>
        <Video
          source={{ uri: videoUri }}
          ref={videoRef}
          style={styles.backgroundVideo}
          paused={paused}
          onProgress={progressCallback}
          onEnd={resetVideo}
        />
      </TouchableWithoutFeedback>
      {controls}
    </Modal>
  );
}

const unboundStyles = {
  modal: {
    backgroundColor: 'black',
    justifyContent: 'center',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    padding: 0,
    borderRadius: 0,
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  footer: {
    position: 'absolute',
    justifyContent: 'flex-end',
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    position: 'absolute',
    justifyContent: 'flex-start',
    left: 0,
    right: 0,
    top: 0,
  },
  playPauseButton: {
    backgroundColor: 'rgba(52,52,52,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    flex: 0,
    height: 76,
  },
  closeButton: {
    paddingTop: 10,
    paddingLeft: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    height: 100,
  },
  progressBar: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    paddingRight: 10,
  },
  iconButton: {
    paddingRight: 10,
    color: 'white',
  },
  durationText: {
    color: 'white',
    fontSize: 11,
  },
};

export default VideoPlaybackModal;
