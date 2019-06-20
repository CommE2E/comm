// @flow

import { type MediaInfo, mediaInfoPropType } from 'lib/types/media-types';
import {
  type VerticalBounds,
  verticalBoundsPropType,
  type LayoutCoordinates,
  layoutCoordinatesPropType,
} from '../types/lightbox-types';

import * as React from 'react';
import PropTypes from 'prop-types';

import {
  type ChatInputState,
  chatInputStatePropType,
  withChatInputState,
} from './chat-input-state';
import InlineMultimedia from './inline-multimedia.react';
import { multimediaMessageBorderRadius } from './multimedia-message.react';
import { getRoundedContainerStyle } from './rounded-message-container.react';

type Props = {|
  mediaInfo: MediaInfo,
  initialCoordinates: LayoutCoordinates,
  verticalBounds: VerticalBounds,
  // withChatInputState
  chatInputState: ?ChatInputState,
|};
class MultimediaTooltipButton extends React.PureComponent<Props> {

  static propTypes = {
    mediaInfo: mediaInfoPropType.isRequired,
    initialCoordinates: layoutCoordinatesPropType.isRequired,
    verticalBounds: verticalBoundsPropType.isRequired,
    chatInputState: chatInputStatePropType,
  };

  render() {
    const { chatInputState, mediaInfo } = this.props;

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

    return (
      <InlineMultimedia
        mediaInfo={mediaInfo}
        style={roundedStyle}
        onPress={this.onPress}
        onLongPress={this.onPress}
        postInProgress={postInProgress}
        pendingUpload={pendingUpload}
      />
    );
  }

  onPress = () => {
  }

}

export default withChatInputState(MultimediaTooltipButton);
