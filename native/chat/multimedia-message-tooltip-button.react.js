// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';

import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipRoute } from '../navigation/tooltip.react';
import { useSelector } from '../redux/redux-utils';
import { InnerMultimediaMessage } from './inner-multimedia-message.react';
import { MessageHeader } from './message-header.react';
import { useAnimatedMessageTooltipButton } from './utils';

/* eslint-disable import/no-named-as-default-member */
const { Node, Extrapolate, interpolateNode } = Animated;
/* eslint-enable import/no-named-as-default-member */

function noop() {}

type Props = {
  +navigation: AppNavigationProp<'MultimediaMessageTooltipModal'>,
  +route: TooltipRoute<'MultimediaMessageTooltipModal'>,
  +progress: Node,
};
function MultimediaMessageTooltipButton(props: Props): React.Node {
  const windowWidth = useSelector(state => state.dimensions.width);
  const { progress } = props;

  const { item, verticalBounds, initialCoordinates } = props.route.params;
  const { style: messageContainerStyle } = useAnimatedMessageTooltipButton({
    sourceMessage: item,
    initialCoordinates,
    messageListVerticalBounds: verticalBounds,
    progress,
    currentDraftHeight: 0,
    targetDraftHeight: 0,
  });

  const headerStyle = React.useMemo(() => {
    const bottom = initialCoordinates.height;
    const opacity = interpolateNode(progress, {
      inputRange: [0, 0.05],
      outputRange: [0, 1],
      extrapolate: Extrapolate.CLAMP,
    });
    return {
      opacity,
      position: 'absolute',
      left: -initialCoordinates.x,
      width: windowWidth,
      bottom,
    };
  }, [initialCoordinates.height, initialCoordinates.x, progress, windowWidth]);

  const { navigation } = props;
  return (
    <Animated.View style={messageContainerStyle}>
      <Animated.View style={headerStyle}>
        <MessageHeader item={item} focused={true} display="modal" />
      </Animated.View>
      <InnerMultimediaMessage
        item={item}
        verticalBounds={verticalBounds}
        clickable={false}
        setClickable={noop}
        onPress={navigation.goBackOnce}
        onLongPress={navigation.goBackOnce}
      />
    </Animated.View>
  );
}

const ConnectedMultimediaMessageTooltipButton: React.ComponentType<Props> = React.memo<Props>(
  MultimediaMessageTooltipButton,
);

export default ConnectedMultimediaMessageTooltipButton;
