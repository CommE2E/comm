// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';
import EmojiPicker from 'rn-emoji-keyboard';

import { localIDPrefix } from 'lib/shared/message-utils.js';
import { useCanCreateReactionFromMessage } from 'lib/shared/reaction-utils.js';

import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useTooltipActions } from '../tooltip/tooltip-hooks.js';
import type { TooltipRoute } from '../tooltip/tooltip.react.js';
import { TooltipInlineEngagement } from './inline-engagement.react.js';
import { InnerTextMessage } from './inner-text-message.react.js';
import { MessageHeader } from './message-header.react.js';
import { MessageListContextProvider } from './message-list-types.js';
import { MessagePressResponderContext } from './message-press-responder-context.js';
import {
  useSendReaction,
  useReactionSelectionPopoverPosition,
} from './reaction-message-utils.js';
import ReactionSelectionPopover from './reaction-selection-popover.react.js';
import SidebarInputBarHeightMeasurer from './sidebar-input-bar-height-measurer.react.js';
import { useAnimatedMessageTooltipButton } from './utils.js';

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
  const { navigation, route, progress, isOpeningSidebar } = props;

  const windowWidth = useSelector(state => state.dimensions.width);

  const [
    sidebarInputBarHeight,
    setSidebarInputBarHeight,
  ] = React.useState<?number>(null);
  const onInputBarMeasured = React.useCallback((height: number) => {
    setSidebarInputBarHeight(height);
  }, []);

  const { item, verticalBounds, initialCoordinates, margin } = route.params;

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

  const messagePressResponderContext = React.useMemo(
    () => ({
      onPressMessage: navigation.goBackOnce,
    }),
    [navigation.goBackOnce],
  );

  const inlineEngagement = React.useMemo(() => {
    if (!item.threadCreatedFromMessage) {
      return null;
    }
    return (
      <TooltipInlineEngagement
        item={item}
        positioning={item.messageInfo.creator.isViewer ? 'right' : 'left'}
        isOpeningSidebar={isOpeningSidebar}
        progress={progress}
        windowWidth={windowWidth}
        initialCoordinates={initialCoordinates}
      />
    );
  }, [initialCoordinates, isOpeningSidebar, item, progress, windowWidth]);

  const { messageInfo, threadInfo, reactions } = item;
  const nextLocalID = useSelector(state => state.nextLocalID);
  const localID = `${localIDPrefix}${nextLocalID}`;

  const canCreateReactionFromMessage = useCanCreateReactionFromMessage(
    threadInfo,
    messageInfo,
  );

  const sendReaction = useSendReaction(
    messageInfo.id,
    localID,
    threadInfo.id,
    reactions,
  );

  const reactionSelectionPopoverPosition = useReactionSelectionPopoverPosition({
    initialCoordinates,
    verticalBounds,
    margin,
  });

  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState<boolean>(false);
  const openEmojiPicker = React.useCallback(() => {
    setEmojiPickerOpen(true);
  }, []);

  const reactionSelectionPopover = React.useMemo(() => {
    if (!canCreateReactionFromMessage) {
      return null;
    }

    return (
      <ReactionSelectionPopover
        navigation={navigation}
        route={route}
        openEmojiPicker={openEmojiPicker}
        reactionSelectionPopoverContainerStyle={
          reactionSelectionPopoverPosition
        }
        sendReaction={sendReaction}
      />
    );
  }, [
    navigation,
    route,
    openEmojiPicker,
    canCreateReactionFromMessage,
    reactionSelectionPopoverPosition,
    sendReaction,
  ]);

  const tooltipRouteKey = route.key;
  const { dismissTooltip } = useTooltipActions(navigation, tooltipRouteKey);

  const onEmojiSelected = React.useCallback(
    emoji => {
      sendReaction(emoji.emoji);
      dismissTooltip();
    },
    [sendReaction, dismissTooltip],
  );

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
        {reactionSelectionPopover}
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
        {inlineEngagement}
      </Animated.View>
      <EmojiPicker
        onEmojiSelected={onEmojiSelected}
        open={emojiPickerOpen}
        onClose={dismissTooltip}
      />
    </MessageListContextProvider>
  );
}

export default TextMessageTooltipButton;
