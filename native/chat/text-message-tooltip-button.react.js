// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';

import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipRoute } from '../navigation/tooltip.react';
import { useSelector } from '../redux/redux-utils';
import { InnerTextMessage } from './inner-text-message.react';
import { MessageHeader } from './message-header.react';
import { MessageListContextProvider } from './message-list-types';
import { useAnimatedMessageTooltipButton } from './utils';

/* eslint-disable import/no-named-as-default-member */
const { Node } = Animated;
/* eslint-enable import/no-named-as-default-member */

type Props = {
  +navigation: AppNavigationProp<'TextMessageTooltipModal'>,
  +route: TooltipRoute<'TextMessageTooltipModal'>,
  +progress: Node,
};
function TextMessageTooltipButton(props: Props): React.Node {
  const { progress } = props;
  const windowWidth = useSelector(state => state.dimensions.width);
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

  const { item, verticalBounds } = props.route.params;
  const { style: messageContainerStyle } = useAnimatedMessageTooltipButton(
    item,
    initialCoordinates,
    verticalBounds,
    progress,
  );

  const threadID = item.threadInfo.id;
  const { navigation } = props;
  return (
    <MessageListContextProvider threadID={threadID}>
      <Animated.View style={headerStyle}>
        <MessageHeader item={item} focused={true} display="modal" />
      </Animated.View>
      <Animated.View style={messageContainerStyle}>
        <InnerTextMessage item={item} onPress={navigation.goBackOnce} />
      </Animated.View>
    </MessageListContextProvider>
  );
}

export default TextMessageTooltipButton;
