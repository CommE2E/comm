// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';
import EmojiPicker from 'rn-emoji-keyboard';

import { localIDPrefix } from 'lib/shared/message-utils';
import { useCanCreateReactionFromMessage } from 'lib/shared/reaction-utils';

import type { AppNavigationProp } from '../navigation/app-navigator.react';
import { useSelector } from '../redux/redux-utils';
import { useTooltipActions } from '../tooltip/tooltip-hooks';
import type { TooltipRoute } from '../tooltip/tooltip.react';
import { TooltipInlineEngagement } from './inline-engagement.react';
import { InnerRobotextMessage } from './inner-robotext-message.react';
import {
  useSendReaction,
  useReactionSelectionPopoverPosition,
} from './reaction-message-utils';
import ReactionSelectionPopover from './reaction-selection-popover.react';
import SidebarInputBarHeightMeasurer from './sidebar-input-bar-height-measurer.react';
import { Timestamp } from './timestamp.react';
import { useAnimatedMessageTooltipButton } from './utils';

/* eslint-disable import/no-named-as-default-member */
const { Node, interpolateNode, Extrapolate } = Animated;
/* eslint-enable import/no-named-as-default-member */

type Props = {
  +navigation: AppNavigationProp<'RobotextMessageTooltipModal'>,
  +route: TooltipRoute<'RobotextMessageTooltipModal'>,
  +progress: Node,
  +isOpeningSidebar: boolean,
};
function RobotextMessageTooltipButton(props: Props): React.Node {
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

  const inlineEngagement = React.useMemo(() => {
    if (!item.threadCreatedFromMessage) {
      return null;
    }
    return (
      <TooltipInlineEngagement
        item={item}
        positioning="center"
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
    <>
      <Animated.View style={messageContainerStyle}>
        <SidebarInputBarHeightMeasurer
          sourceMessage={item}
          onInputBarMeasured={onInputBarMeasured}
        />
        <Animated.View style={headerStyle}>
          <Timestamp time={item.messageInfo.time} display="modal" />
        </Animated.View>
        {reactionSelectionPopover}
        <InnerRobotextMessage item={item} onPress={navigation.goBackOnce} />
        {inlineEngagement}
      </Animated.View>
      <EmojiPicker
        onEmojiSelected={onEmojiSelected}
        open={emojiPickerOpen}
        onClose={dismissTooltip}
      />
    </>
  );
}

export default RobotextMessageTooltipButton;
