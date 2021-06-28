// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';

import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipRoute } from '../navigation/tooltip.react';
import { useSelector } from '../redux/redux-utils';
import { InnerRobotextMessage } from './inner-robotext-message.react';
import { Timestamp } from './timestamp.react';

/* eslint-disable import/no-named-as-default-member */
const { Value } = Animated;
/* eslint-enable import/no-named-as-default-member */

type Props = {|
  +navigation: AppNavigationProp<'RobotextMessageTooltipModal'>,
  +route: TooltipRoute<'RobotextMessageTooltipModal'>,
  +progress: Value,
|};
function RobotextMessageTooltipButton(props: Props) {
  const { progress } = props;
  const windowWidth = useSelector((state) => state.dimensions.width);
  const { initialCoordinates } = props.route.params;
  const headerStyle = React.useMemo(() => {
    const bottom = initialCoordinates.height;
    return {
      opacity: progress,
      position: 'absolute',
      left: -initialCoordinates.x,
      width: windowWidth,
      bottom,
    };
  }, [progress, windowWidth, initialCoordinates]);

  const { item } = props.route.params;
  const { navigation } = props;

  return (
    <React.Fragment>
      <Animated.View style={headerStyle}>
        <Timestamp time={item.messageInfo.time} display="modal" />
      </Animated.View>
      <InnerRobotextMessage item={item} onPress={navigation.goBackOnce} />
    </React.Fragment>
  );
}

export default RobotextMessageTooltipButton;
