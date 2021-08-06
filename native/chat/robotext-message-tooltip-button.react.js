// @flow

import * as React from 'react';
import Animated, { interpolateNode } from 'react-native-reanimated';

import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipRoute } from '../navigation/tooltip.react';
import { useSelector } from '../redux/redux-utils';
import { InnerRobotextMessage } from './inner-robotext-message.react';
import { Timestamp } from './timestamp.react';
import { useAnimatedMessageTooltipButton } from './utils';

/* eslint-disable import/no-named-as-default-member */
const { Node } = Animated;
/* eslint-enable import/no-named-as-default-member */

type Props = {
  +navigation: AppNavigationProp<'RobotextMessageTooltipModal'>,
  +route: TooltipRoute<'RobotextMessageTooltipModal'>,
  +progress: Node,
};
function RobotextMessageTooltipButton(props: Props): React.Node {
  const { progress } = props;
  const windowWidth = useSelector(state => state.dimensions.width);

  const { item, verticalBounds, initialCoordinates } = props.route.params;
  const {
    style: messageContainerStyle,
    isAnimatingToSidebar,
  } = useAnimatedMessageTooltipButton(
    item,
    initialCoordinates,
    verticalBounds,
    progress,
  );

  const headerStyle = React.useMemo(() => {
    const bottom = initialCoordinates.height;
    const opacity = interpolateNode(progress, {
      inputRange: [0, 1],
      outputRange: [isAnimatingToSidebar ? 0.5 : 0, 1],
    });
    return {
      opacity,
      position: 'absolute',
      left: -initialCoordinates.x,
      width: windowWidth,
      bottom,
    };
  }, [
    initialCoordinates.height,
    initialCoordinates.x,
    progress,
    isAnimatingToSidebar,
    windowWidth,
  ]);

  const { navigation } = props;
  return (
    <Animated.View style={messageContainerStyle}>
      <Animated.View style={headerStyle}>
        <Timestamp time={item.messageInfo.time} display="modal" />
      </Animated.View>
      <InnerRobotextMessage item={item} onPress={navigation.goBackOnce} />
    </Animated.View>
  );
}

export default RobotextMessageTooltipButton;
