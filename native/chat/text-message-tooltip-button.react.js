// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';

import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipRoute } from '../navigation/tooltip.react';
import { useSelector } from '../redux/redux-utils';
import { TooltipInlineSidebar } from './inline-sidebar.react';
import { InnerTextMessage } from './inner-text-message.react';
import { MessageHeader } from './message-header.react';
import { MessageListContextProvider } from './message-list-types';
import { MessagePressResponderContext } from './message-press-responder-context';
import SidebarInputBarHeightMeasurer from './sidebar-input-bar-height-measurer.react';
import { useAnimatedMessageTooltipButton } from './utils';

/* eslint-disable import/no-named-as-default-member */
const { Node, interpolateNode, Extrapolate } = Animated;
/* eslint-enable import/no-named-as-default-member */

type Props = {
  +navigation: AppNavigationProp<'TextMessageTooltipModal'>,
  +route: TooltipRoute<'TextMessageTooltipModal'>,
  +progress: Node,
  +isOpeningSidebar: boolean,
};
function TextMessageTooltipButton(props: Props): React.Node {
  const { progress } = props;
  const windowWidth = useSelector(state => state.dimensions.width);

  const [
    sidebarInputBarHeight,
    setSidebarInputBarHeight,
  ] = React.useState<?number>(null);
  const onInputBarMeasured = React.useCallback((height: number) => {
    setSidebarInputBarHeight(height);
  }, []);

  const { item, verticalBounds, initialCoordinates } = props.route.params;
  const {
    style: messageContainerStyle,
    threadColorOverride,
    isThreadColorDarkOverride,
  } = useAnimatedMessageTooltipButton({
    sourceMessage: item,
    initialCoordinates,
    messageListVerticalBounds: verticalBounds,
    progress,
    targetInputBarHeight: sidebarInputBarHeight,
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

  const threadID = item.threadInfo.id;
  const { navigation, isOpeningSidebar } = props;

  const messagePressResponderContext = React.useMemo(
    () => ({
      onPressMessage: navigation.goBackOnce,
    }),
    [navigation.goBackOnce],
  );

  const inlineSidebar = React.useMemo(() => {
    if (!item.threadCreatedFromMessage) {
      return null;
    }
    return (
      <TooltipInlineSidebar
        item={item}
        positioning={item.messageInfo.creator.isViewer ? 'right' : 'left'}
        isOpeningSidebar={isOpeningSidebar}
        progress={progress}
        windowWidth={windowWidth}
        initialCoordinates={initialCoordinates}
      />
    );
  }, [initialCoordinates, isOpeningSidebar, item, progress, windowWidth]);
  return (
    <MessageListContextProvider threadID={threadID}>
      <SidebarInputBarHeightMeasurer
        sourceMessage={item}
        onInputBarMeasured={onInputBarMeasured}
      />
      <Animated.View style={messageContainerStyle}>
        <Animated.View style={headerStyle}>
          <MessageHeader item={item} focused={true} display="modal" />
        </Animated.View>
        <MessagePressResponderContext.Provider
          value={messagePressResponderContext}
        >
          <InnerTextMessage
            item={item}
            onPress={navigation.goBackOnce}
            threadColorOverride={threadColorOverride}
            isThreadColorDarkOverride={isThreadColorDarkOverride}
          />
        </MessagePressResponderContext.Provider>
        {inlineSidebar}
      </Animated.View>
    </MessageListContextProvider>
  );
}

export default TextMessageTooltipButton;
