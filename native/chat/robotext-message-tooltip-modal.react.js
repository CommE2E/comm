// @flow

import * as React from 'react';

import SWMansionIcon from '../components/swmansion-icon.react';
import {
  createTooltip,
  type TooltipParams,
  type BaseTooltipProps,
  type TooltipMenuProps,
} from '../tooltip/tooltip.react';
import type { ChatRobotextMessageInfoItemWithHeight } from '../types/chat-types';
import RobotextMessageTooltipButton from './robotext-message-tooltip-button.react';
import { useAnimatedNavigateToSidebar } from './sidebar-navigation';

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
