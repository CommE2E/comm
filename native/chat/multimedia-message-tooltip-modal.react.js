// @flow

import * as React from 'react';

import {
  createTooltip,
  type TooltipParams,
  type BaseTooltipProps,
} from '../navigation/tooltip.react';
import type { ChatMultimediaMessageInfoItem } from '../types/chat-types';
import type { VerticalBounds } from '../types/layout-types';
import { onPressReport } from './message-report-utils';
import MultimediaMessageTooltipButton from './multimedia-message-tooltip-button.react';
import { navigateToSidebar } from './sidebar-navigation';

export type MultimediaMessageTooltipModalParams = TooltipParams<{
  +item: ChatMultimediaMessageInfoItem,
  +verticalBounds: VerticalBounds,
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
    {
      id: 'report',
      text: 'Report',
      onPress: onPressReport,
    },
  ],
};

const MultimediaMessageTooltipModal: React.ComponentType<
  BaseTooltipProps<'MultimediaMessageTooltipModal'>,
> = createTooltip<'MultimediaMessageTooltipModal'>(
  MultimediaMessageTooltipButton,
  spec,
);

export default MultimediaMessageTooltipModal;
