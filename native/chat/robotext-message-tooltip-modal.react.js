// @flow

import * as React from 'react';

import RobotextMessageTooltipButton from './robotext-message-tooltip-button.react.js';
import { useAnimatedNavigateToSidebar } from './sidebar-navigation.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import {
  createTooltip,
  type TooltipParams,
  type BaseTooltipProps,
  type TooltipMenuProps,
} from '../tooltip/tooltip.react.js';
import type { ChatRobotextMessageInfoItemWithHeight } from '../types/chat-types.js';

export type RobotextMessageTooltipModalParams = TooltipParams<{
  +item: ChatRobotextMessageInfoItemWithHeight,
}>;

function TooltipMenu(
  props: TooltipMenuProps<'RobotextMessageTooltipModal'>,
): React.Node {
  const { route, tooltipItem: TooltipItem } = props;

  const onPress = useAnimatedNavigateToSidebar(route.params.item);
  const renderIcon = React.useCallback(
    style => (
      <SWMansionIcon name="message-circle-lines" style={style} size={16} />
    ),
    [],
  );

  return (
    <>
      <TooltipItem
        id="sidebar"
        text="Thread"
        onPress={onPress}
        renderIcon={renderIcon}
        key="sidebar"
      />
    </>
  );
}

const RobotextMessageTooltipModal: React.ComponentType<
  BaseTooltipProps<'RobotextMessageTooltipModal'>,
> = createTooltip<'RobotextMessageTooltipModal'>(
  RobotextMessageTooltipButton,
  TooltipMenu,
);

export default RobotextMessageTooltipModal;
