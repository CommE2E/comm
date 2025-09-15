// @flow

import * as React from 'react';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

import { chatMessageItemHasEngagement } from 'lib/shared/chat-message-item-utils.js';
import {
  useViewerAlreadySelectedMessageReactions,
  useCanCreateReactionFromMessage,
} from 'lib/shared/reaction-utils.js';

import { TooltipInlineEngagement } from './inline-engagement.react.js';
import { InnerTextMessage } from './inner-text-message.react.js';
import { MessageHeader } from './message-header.react.js';
import { MessageListContextProvider } from './message-list-types.js';
import { MessagePressResponderContext } from './message-press-responder-context.js';
import MessageTooltipButtonAvatar from './message-tooltip-button-avatar.react.js';
import { useSendReaction } from './reaction-message-utils.js';
import ReactionSelectionPopover from './reaction-selection-popover.react.js';
import SidebarInputBarHeightMeasurer from './sidebar-input-bar-height-measurer.react.js';
import { useAnimatedMessageTooltipButton } from './utils.js';
import EmojiKeyboard from '../components/emoji-keyboard.react.js';
import type { EmojiSelection } from '../components/emoji-keyboard.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useTooltipActions } from '../tooltip/tooltip-hooks.js';
import type { TooltipRoute } from '../tooltip/tooltip.react.js';

type Props = {
  +navigation: AppNavigationProp<'TextMessageTooltipModal'>,
  +route: TooltipRoute<'TextMessageTooltipModal'>,
  +progress: SharedValue<number>,
  +isOpeningSidebar: boolean,
};
function TextMessageTooltipButton(props: Props): React.Node {
  const { navigation, route, progress, isOpeningSidebar } = props;

  const windowWidth = useSelector(state => state.dimensions.width);

  const [sidebarInputBarHeight, setSidebarInputBarHeight] =
    React.useState<?number>(null);
  const onInputBarMeasured = React.useCallback((height: number) => {
    setSidebarInputBarHeight(height);
  }, []);

  const { item, verticalBounds, initialCoordinates } = route.params;

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

  const headerStyle = useAnimatedStyle(() => {
    const bottom = initialCoordinates.height;
    const opacity = interpolate(
      progress.value,
      [0, 0.05],
      [0, 1],
      Extrapolate.CLAMP,
    );
    return {
      opacity,
      position: 'absolute',
      left: -initialCoordinates.x,
      width: windowWidth,
      bottom,
    };
  }, [initialCoordinates.height, initialCoordinates.x, windowWidth]);

  const messagePressResponderContext = React.useMemo(
    () => ({
      onPressMessage: navigation.goBackOnce,
    }),
    [navigation.goBackOnce],
  );

  const inlineEngagement = React.useMemo(() => {
    if (!chatMessageItemHasEngagement(item, item.threadInfo.id)) {
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

  const canCreateReactionFromMessage = useCanCreateReactionFromMessage(
    threadInfo,
    messageInfo,
  );

  const sendReaction = useSendReaction(messageInfo, threadInfo, reactions);

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
        sendReaction={sendReaction}
      />
    );
  }, [
    navigation,
    route,
    openEmojiPicker,
    canCreateReactionFromMessage,
    sendReaction,
  ]);

  const tooltipRouteKey = route.key;
  const { dismissTooltip } = useTooltipActions(navigation, tooltipRouteKey);

  const onEmojiSelected = React.useCallback(
    (emoji: EmojiSelection) => {
      sendReaction(emoji.emoji);
      dismissTooltip();
    },
    [sendReaction, dismissTooltip],
  );

  const alreadySelectedEmojis =
    useViewerAlreadySelectedMessageReactions(reactions);

  return (
    <MessageListContextProvider threadInfo={threadInfo}>
      <SidebarInputBarHeightMeasurer
        sourceMessage={item}
        onInputBarMeasured={onInputBarMeasured}
      />
      <Animated.View style={messageContainerStyle}>
        <Animated.View style={headerStyle}>
          <MessageHeader item={item} focused={true} display="modal" />
        </Animated.View>
        <MessageTooltipButtonAvatar item={item} />
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
      <EmojiKeyboard
        onEmojiSelected={onEmojiSelected}
        emojiKeyboardOpen={emojiPickerOpen}
        onEmojiKeyboardClose={dismissTooltip}
        alreadySelectedEmojis={alreadySelectedEmojis}
        selectMultipleEmojis
      />
    </MessageListContextProvider>
  );
}

export default TextMessageTooltipButton;
