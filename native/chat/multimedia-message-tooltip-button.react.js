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
const { Node } = Animated;
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
  }, [initialCoordinates.height, initialCoordinates.x, progress, windowWidth]);

  const { item, verticalBounds } = props.route.params;
  const { style: messageContainerStyle } = useAnimatedMessageTooltipButton(
    item,
    initialCoordinates,
    verticalBounds,
    progress,
  );

  const { navigation } = props;
  return (
    <React.Fragment>
      <Animated.View style={headerStyle}>
        <MessageHeader item={item} focused={true} display="modal" />
      </Animated.View>
      <Animated.View style={messageContainerStyle}>
        <InnerMultimediaMessage
          item={item}
          verticalBounds={verticalBounds}
          clickable={false}
          setClickable={noop}
          onPress={navigation.goBackOnce}
          onLongPress={navigation.goBackOnce}
        />
      </Animated.View>
    </React.Fragment>
  );
}

const ConnectedMultimediaMessageTooltipButton: React.ComponentType<Props> = React.memo<Props>(
  MultimediaMessageTooltipButton,
);

export default ConnectedMultimediaMessageTooltipButton;
