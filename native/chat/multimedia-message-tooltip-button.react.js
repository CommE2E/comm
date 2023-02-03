// @flow

import * as React from 'react';
import Animated, { type SharedValue } from 'react-native-reanimated';
import EmojiPicker from 'rn-emoji-keyboard';

import { localIDPrefix } from 'lib/shared/message-utils';
import { useCanCreateReactionFromMessage } from 'lib/shared/reaction-utils';
import type { SetState } from 'lib/types/hook-types';

import type { AppNavigationProp } from '../navigation/app-navigator.react';
import { useSelector } from '../redux/redux-utils';
import type { TooltipRoute } from '../tooltip/tooltip.react';
import { TooltipInlineEngagement } from './inline-engagement.react';
import { InnerMultimediaMessage } from './inner-multimedia-message.react';
import { MessageHeader } from './message-header.react';
import {
  useSendReaction,
  useReactionSelectionPopoverPosition,
} from './reaction-message-utils';
import ReactionSelectionPopover from './reaction-selection-popover.react';
import SidebarInputBarHeightMeasurer from './sidebar-input-bar-height-measurer.react';
import { useAnimatedMessageTooltipButton } from './utils';

/* eslint-disable import/no-named-as-default-member */
const { Node, Extrapolate, interpolateNode } = Animated;
/* eslint-enable import/no-named-as-default-member */

function noop() {}

type Props = {
  +navigation: AppNavigationProp<'MultimediaMessageTooltipModal'>,
  +route: TooltipRoute<'MultimediaMessageTooltipModal'>,
  +progress: Node,
  +isOpeningSidebar: boolean,
  +setHideTooltip: SetState<boolean>,
  +showEmojiKeyboard: SharedValue<boolean>,
};
function MultimediaMessageTooltipButton(props: Props): React.Node {
  const {
    navigation,
    progress,
    isOpeningSidebar,
    setHideTooltip,
    showEmojiKeyboard,
  } = props;

  const windowWidth = useSelector(state => state.dimensions.width);

  const [
    sidebarInputBarHeight,
    setSidebarInputBarHeight,
  ] = React.useState<?number>(null);
  const onInputBarMeasured = React.useCallback((height: number) => {
    setSidebarInputBarHeight(height);
  }, []);

  const {
    item,
    verticalBounds,
    initialCoordinates,
    margin,
  } = props.route.params;

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
        positioning={item.messageInfo.creator.isViewer ? 'right' : 'left'}
        isOpeningSidebar={isOpeningSidebar}
        progress={progress}
        windowWidth={windowWidth}
        initialCoordinates={initialCoordinates}
      />
    );
  }, [initialCoordinates, isOpeningSidebar, item, progress, windowWidth]);

  const innerMultimediaMessage = React.useMemo(
    () => (
      <InnerMultimediaMessage
        item={item}
        verticalBounds={verticalBounds}
        clickable={false}
        setClickable={noop}
        onPress={navigation.goBackOnce}
        onLongPress={navigation.goBackOnce}
      />
    ),
    [item, navigation.goBackOnce, verticalBounds],
  );

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

  const reactionSelectionPopover = React.useMemo(() => {
    if (!canCreateReactionFromMessage) {
      return null;
    }

    return (
      <ReactionSelectionPopover
        setHideTooltip={setHideTooltip}
        showEmojiKeyboard={showEmojiKeyboard}
        reactionSelectionPopoverContainerStyle={
          reactionSelectionPopoverPosition
        }
        sendReaction={sendReaction}
      />
    );
  }, [
    canCreateReactionFromMessage,
    reactionSelectionPopoverPosition,
    sendReaction,
    setHideTooltip,
    showEmojiKeyboard,
  ]);

  const onEmojiSelected = React.useCallback(
    emoji => {
      sendReaction(emoji.emoji);
      setHideTooltip(true);
    },
    [sendReaction, setHideTooltip],
  );

  const onCloseEmojiPicker = React.useCallback(() => {
    showEmojiKeyboard.value = false;
    navigation.goBackOnce();
  }, [navigation, showEmojiKeyboard]);

  return (
    <>
      <Animated.View style={messageContainerStyle}>
        <SidebarInputBarHeightMeasurer
          sourceMessage={item}
          onInputBarMeasured={onInputBarMeasured}
        />
        <Animated.View style={headerStyle}>
          <MessageHeader item={item} focused={true} display="modal" />
        </Animated.View>
        {reactionSelectionPopover}
        {innerMultimediaMessage}
        {inlineEngagement}
      </Animated.View>
      <EmojiPicker
        onEmojiSelected={onEmojiSelected}
        open={showEmojiKeyboard.value}
        onClose={onCloseEmojiPicker}
      />
    </>
  );
}

export default MultimediaMessageTooltipButton;
