// @flow

import * as React from 'react';

import {
  createTooltip,
  type TooltipParams,
  type BaseTooltipProps,
} from '../navigation/tooltip.react';
import type { ChatRobotextMessageInfoItemWithHeight } from '../types/chat-types';
import { onPressReact } from './reaction-message-utils';
import RobotextMessageTooltipButton from './robotext-message-tooltip-button.react';
import { navigateToSidebar } from './sidebar-navigation';

export type RobotextMessageTooltipModalParams = TooltipParams<{
  +item: ChatRobotextMessageInfoItemWithHeight,
}>;

const spec = {
  entries: [
    {
      id: 'sidebar',
      text: 'Thread',
      onPress: navigateToSidebar,
    },
    {
      id: 'react',
      text: '👍',
      onPress: onPressReact,
    },
  ],
};

const RobotextMessageTooltipModal: React.ComponentType<
  BaseTooltipProps<'RobotextMessageTooltipModal'>,
> = createTooltip<'RobotextMessageTooltipModal'>(
  RobotextMessageTooltipButton,
  spec,
);

export default RobotextMessageTooltipModal;
