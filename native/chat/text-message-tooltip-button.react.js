// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';

import { localIDPrefix } from 'lib/shared/message-utils.js';
import {
  getViewerAlreadySelectedMessageReactions,
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
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useTooltipActions } from '../tooltip/tooltip-hooks.js';
import type { TooltipRoute } from '../tooltip/tooltip.react.js';

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
    emoji => {
      sendReaction(emoji.emoji);
      dismissTooltip();
    },
    [sendReaction, dismissTooltip],
  );

  const alreadySelectedEmojis = React.useMemo(
    () => getViewerAlreadySelectedMessageReactions(item.reactions),
    [item.reactions],
  );

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
      />
    </MessageListContextProvider>
  );
}

export default TextMessageTooltipButton;
