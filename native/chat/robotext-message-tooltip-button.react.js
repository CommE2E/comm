// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';

import { chatMessageItemEngagementTargetMessageInfo } from 'lib/shared/chat-message-item-utils.js';
import {
  useViewerAlreadySelectedMessageReactions,
  useCanCreateReactionFromMessage,
} from 'lib/shared/reaction-utils.js';

import { InnerRobotextMessage } from './inner-robotext-message.react.js';
import { useSendReaction } from './reaction-message-utils.js';
import ReactionSelectionPopover from './reaction-selection-popover.react.js';
import SidebarInputBarHeightMeasurer from './sidebar-input-bar-height-measurer.react.js';
import { Timestamp } from './timestamp.react.js';
import { useAnimatedMessageTooltipButton } from './utils.js';
import EmojiKeyboard from '../components/emoji-keyboard.react.js';
import type { EmojiSelection } from '../components/emoji-keyboard.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useTooltipActions } from '../tooltip/tooltip-hooks.js';
import type { TooltipRoute } from '../tooltip/tooltip.react.js';

const { Node, interpolateNode, Extrapolate } = Animated;

type Props = {
  +navigation: AppNavigationProp<'RobotextMessageTooltipModal'>,
  +route: TooltipRoute<'RobotextMessageTooltipModal'>,
  +progress: Node,
  ...
};
function RobotextMessageTooltipButton(props: Props): React.Node {
  const { navigation, route, progress } = props;

  const windowWidth = useSelector(state => state.dimensions.width);

  const [sidebarInputBarHeight, setSidebarInputBarHeight] =
    React.useState<?number>(null);
  const onInputBarMeasured = React.useCallback((height: number) => {
    setSidebarInputBarHeight(height);
  }, []);

  const { item, verticalBounds, initialCoordinates } = route.params;

  const { style: messageContainerStyle } = useAnimatedMessageTooltipButton({
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

  const { threadInfo, reactions } = item;
  const engagementTargetMessageInfo =
    chatMessageItemEngagementTargetMessageInfo(item);

  const canCreateReactionFromMessage = useCanCreateReactionFromMessage(
    threadInfo,
    engagementTargetMessageInfo,
  );

  const sendReaction = useSendReaction(
    engagementTargetMessageInfo?.id,
    threadInfo,
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
    (emoji: EmojiSelection) => {
      sendReaction(emoji.emoji);
      dismissTooltip();
    },
    [sendReaction, dismissTooltip],
  );

  const alreadySelectedEmojis =
    useViewerAlreadySelectedMessageReactions(reactions);

  return (
    <>
      <Animated.View style={messageContainerStyle}>
        <SidebarInputBarHeightMeasurer
          sourceMessage={item}
          onInputBarMeasured={onInputBarMeasured}
        />
        <Animated.View style={headerStyle}>
          <Timestamp item={item} display="modal" />
        </Animated.View>
        {reactionSelectionPopover}
        <InnerRobotextMessage item={item} onPress={navigation.goBackOnce} />
      </Animated.View>
      <EmojiKeyboard
        onEmojiSelected={onEmojiSelected}
        emojiKeyboardOpen={emojiPickerOpen}
        onEmojiKeyboardClose={dismissTooltip}
        alreadySelectedEmojis={alreadySelectedEmojis}
        selectMultipleEmojis
      />
    </>
  );
}

export default RobotextMessageTooltipButton;
