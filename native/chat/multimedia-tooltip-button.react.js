// @flow

import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { messageID } from 'lib/shared/message-utils';

import { type InputState, InputStateContext } from '../input/input-state';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipRoute } from '../navigation/tooltip.react';
import { useSelector } from '../redux/redux-utils';
import InlineMultimedia from './inline-multimedia.react';
import { MessageHeader } from './message-header.react';
import { multimediaMessageBorderRadius } from './multimedia-message.react';
import { getRoundedContainerStyle } from './rounded-corners';

/* eslint-disable import/no-named-as-default-member */
const { Value } = Animated;
/* eslint-enable import/no-named-as-default-member */

type BaseProps = {|
  +navigation: AppNavigationProp<'MultimediaTooltipModal'>,
  +route: TooltipRoute<'MultimediaTooltipModal'>,
  +progress: Value,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +windowWidth: number,
  // withInputState
  +inputState: ?InputState,
|};
class MultimediaTooltipButton extends React.PureComponent<Props> {
  get headerStyle() {
    const { initialCoordinates, verticalOffset } = this.props.route.params;
    const bottom = initialCoordinates.height + verticalOffset;
    return {
      opacity: this.props.progress,
      position: 'absolute',
      left: -initialCoordinates.x,
      width: this.props.windowWidth,
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
    this.props.navigation.goBackOnce();
  };
}

const styles = StyleSheet.create({
  media: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default React.memo<BaseProps>(function ConnectedMultimediaTooltipButton(
  props: BaseProps,
) {
  const windowWidth = useSelector((state) => state.dimensions.width);
  const inputState = React.useContext(InputStateContext);
  return (
    <MultimediaTooltipButton
      {...props}
      windowWidth={windowWidth}
      inputState={inputState}
    />
  );
});
