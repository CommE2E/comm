// @flow

import * as React from 'react';

import {
  createTooltip,
  tooltipHeight,
  type TooltipParams,
  type BaseTooltipProps,
} from '../navigation/tooltip.react';
import type { ChatRobotextMessageInfoItemWithHeight } from '../types/chat-types';
import RobotextMessageTooltipButton from './robotext-message-tooltip-button.react';
import { navigateToSidebar } from './sidebar-navigation';

export type RobotextMessageTooltipModalParams = TooltipParams<{
  +item: ChatRobotextMessageInfoItemWithHeight,
}>;

const spec = {
  entries: [
    {
      id: 'create_sidebar',
      text: 'Create thread',
      onPress: navigateToSidebar,
    },
    {
      id: 'open_sidebar',
      text: 'Go to thread',
      onPress: navigateToSidebar,
    },
  ],
};

const RobotextMessageTooltipModal: React.ComponentType<
  BaseTooltipProps<'RobotextMessageTooltipModal'>,
> = createTooltip<'RobotextMessageTooltipModal'>(
  RobotextMessageTooltipButton,
  spec,
);

const robotextMessageTooltipHeight: number = tooltipHeight(spec.entries.length);

export { RobotextMessageTooltipModal, robotextMessageTooltipHeight };
