// @flow

import {
  mediaInfoPropType,
  type Dimensions,
  dimensionsPropType,
} from 'lib/types/media-types';
import {
  verticalBoundsPropType,
  layoutCoordinatesPropType,
} from '../types/layout-types';
import type { AppState } from '../redux/redux-setup';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipRoute } from '../navigation/tooltip.react';

import * as React from 'react';
import Animated from 'react-native-reanimated';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';

import { connect } from 'lib/utils/redux-utils';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import { messageID } from 'lib/shared/message-utils';

import {
  type InputState,
  inputStatePropType,
  withInputState,
} from '../input/input-state';
import InlineMultimedia from './inline-multimedia.react';
import { multimediaMessageBorderRadius } from './multimedia-message.react';
import { getRoundedContainerStyle } from './rounded-corners';
import { MessageHeader } from './message-header.react';
import { dimensionsSelector } from '../selectors/dimension-selectors';

const { Value } = Animated;

type Props = {
  navigation: AppNavigationProp<'MultimediaTooltipModal'>,
  route: TooltipRoute<'MultimediaTooltipModal',>,
  progress: Value,
  // Redux state
  screenDimensions: Dimensions,
  // withInputState
  inputState: ?InputState,
};
class MultimediaTooltipButton extends React.PureComponent<Props> {
  static propTypes = {
    navigation: PropTypes.shape({
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    route: PropTypes.shape({
      params: PropTypes.shape({
        initialCoordinates: layoutCoordinatesPropType.isRequired,
        verticalBounds: verticalBoundsPropType.isRequired,
        location: PropTypes.oneOf(['above', 'below']),
        margin: PropTypes.number,
        item: chatMessageItemPropType.isRequired,
        mediaInfo: mediaInfoPropType.isRequired,
        verticalOffset: PropTypes.number.isRequired,
      }).isRequired,
    }).isRequired,
    progress: PropTypes.object.isRequired,
    screenDimensions: dimensionsPropType.isRequired,
    inputState: inputStatePropType,
  };

  get headerStyle() {
    const {
      initialCoordinates,
      verticalOffset,
    } = this.props.route.params;
    const bottom = initialCoordinates.height + verticalOffset;
    return {
      opacity: this.props.progress,
      position: 'absolute',
      left: -initialCoordinates.x,
      width: this.props.screenDimensions.width,
      bottom,
    };
  }

  render() {
    const { inputState } = this.props;
    const { mediaInfo, item } = this.props.route.params;

    const { id: mediaID } = mediaInfo;
    const ourMessageID = messageID(item.messageInfo);
    const pendingUploads =
      inputState &&
      inputState.pendingUploads &&
      inputState.pendingUploads[ourMessageID];
    const pendingUpload = pendingUploads && pendingUploads[mediaID];
    const postInProgress = !!pendingUploads;

    const roundedStyle = getRoundedContainerStyle(
      mediaInfo.corners,
      multimediaMessageBorderRadius,
    );

    return (
      <React.Fragment>
        <Animated.View style={this.headerStyle}>
          <MessageHeader item={item} focused={true} display="modal" />
        </Animated.View>
        <View style={[styles.media, roundedStyle]}>
          <InlineMultimedia
            mediaInfo={mediaInfo}
            onPress={this.onPress}
            onLongPress={this.onPress}
            postInProgress={postInProgress}
            pendingUpload={pendingUpload}
            spinnerColor="white"
          />
        </View>
      </React.Fragment>
    );
  }

  onPress = () => {
    this.props.navigation.goBack();
  };
}

const styles = StyleSheet.create({
  media: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default connect((state: AppState) => ({
  screenDimensions: dimensionsSelector(state),
}))(withInputState(MultimediaTooltipButton));
