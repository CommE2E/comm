// @flow

import {
  type MediaInfo,
  mediaInfoPropType,
  type Dimensions,
  dimensionsPropType,
} from 'lib/types/media-types';
import {
  type VerticalBounds,
  verticalBoundsPropType,
  type LayoutCoordinates,
  layoutCoordinatesPropType,
} from '../types/lightbox-types';
import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import type { RawMessageInfo } from 'lib/types/message-types';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import PropTypes from 'prop-types';
import { View } from 'react-native';

import { connect } from 'lib/utils/redux-utils';

import {
  type ChatInputState,
  chatInputStatePropType,
  withChatInputState,
} from './chat-input-state';
import InlineMultimedia from './inline-multimedia.react';
import { multimediaMessageBorderRadius } from './multimedia-message.react';
import { getRoundedContainerStyle } from './rounded-message-container.react';
import Timestamp from './timestamp.react';
import { dimensionsSelector } from '../selectors/dimension-selectors';

type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {
    mediaInfo: MediaInfo,
    initialCoordinates: LayoutCoordinates,
    verticalBounds: VerticalBounds,
    verticalOffset: number,
  },
|}>;

type Props = {
  navigation: NavProp,
  // Redux state
  rawMessageInfo: ?RawMessageInfo,
  screenDimensions: Dimensions,
  // withChatInputState
  chatInputState: ?ChatInputState,
};
class MultimediaTooltipButton extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          mediaInfo: mediaInfoPropType.isRequired,
          initialCoordinates: layoutCoordinatesPropType.isRequired,
          verticalBounds: verticalBoundsPropType.isRequired,
          verticalOffset: PropTypes.number.isRequired,
        }).isRequired,
      }).isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    rawMessageInfo: PropTypes.object,
    screenDimensions: dimensionsPropType.isRequired,
    chatInputState: chatInputStatePropType,
  };

  get timestampStyle() {
    const { initialCoordinates, verticalOffset } = this.props.navigation.state.params;
    const top = -26 - verticalOffset;
    return {
      position: 'absolute',
      left: -initialCoordinates.x,
      width: this.props.screenDimensions.width,
      top,
    };
  }

  render() {
    const { chatInputState } = this.props;
    const { mediaInfo } = this.props.navigation.state.params;

    const { id: mediaID, messageID } = mediaInfo;
    const pendingUploads = chatInputState
      && chatInputState.pendingUploads
      && chatInputState.pendingUploads[messageID];
    const pendingUpload = pendingUploads && pendingUploads[mediaID];
    const postInProgress = !!pendingUploads;

    const roundedStyle = getRoundedContainerStyle(
      mediaInfo.corners,
      multimediaMessageBorderRadius,
    );

    let timestamp = null;
    if (this.props.rawMessageInfo) {
      const { time } = this.props.rawMessageInfo;
      timestamp = (
        <View style={this.timestampStyle}>
          <Timestamp time={time} color="light" />
        </View>
      );
    }

    return (
      <React.Fragment>
        {timestamp}
        <InlineMultimedia
          mediaInfo={mediaInfo}
          style={roundedStyle}
          onPress={this.onPress}
          onLongPress={this.onPress}
          postInProgress={postInProgress}
          pendingUpload={pendingUpload}
        />
      </React.Fragment>
    );
  }

  onPress = () => {
    this.props.navigation.goBack();
  }

}

export default connect(
  (state: AppState, ownProps: { navigation: NavProp }) => {
    const { messageID } = ownProps.navigation.state.params.mediaInfo;
    const rawMessageInfo = state.messageStore.messages[messageID];
    return {
      rawMessageInfo,
      screenDimensions: dimensionsSelector(state),
    };
  },
)(withChatInputState(MultimediaTooltipButton));
