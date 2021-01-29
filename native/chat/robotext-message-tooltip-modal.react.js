// @flow

import {
  createTooltip,
  tooltipHeight,
  type TooltipParams,
} from '../navigation/tooltip.react';
import RobotextMessageTooltipButton from './robotext-message-tooltip-button.react';
import type { ChatRobotextMessageInfoItemWithHeight } from './robotext-message.react';
import { onPressGoToSidebar, onPressCreateSidebar } from './sidebar-navigation';

export type RobotextMessageTooltipModalParams = TooltipParams<{|
  +item: ChatRobotextMessageInfoItemWithHeight,
  +robotext: string,
|}>;

const spec = {
  entries: [
    {
      id: 'create_sidebar',
      text: 'Create sidebar',
      onPress: onPressCreateSidebar,
    },
    {
      id: 'open_sidebar',
      text: 'Go to sidebar',
      onPress: onPressGoToSidebar,
    },
  ],
};

const RobotextMessageTooltipModal = createTooltip<
  'RobotextMessageTooltipModal',
>(RobotextMessageTooltipButton, spec);

const robotextMessageTooltipHeight = tooltipHeight(spec.entries.length);

export { RobotextMessageTooltipModal, robotextMessageTooltipHeight };
