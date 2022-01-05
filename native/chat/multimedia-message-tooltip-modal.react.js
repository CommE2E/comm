// @flow

import * as React from 'react';

import { displayActionResultModal } from '../navigation/action-result-modal';
import {
  createTooltip,
  tooltipHeight,
  type TooltipParams,
  type BaseTooltipProps,
} from '../navigation/tooltip.react';
import type { ChatMultimediaMessageInfoItem } from '../types/chat-types';
import type { VerticalBounds } from '../types/layout-types';
import MultimediaMessageTooltipButton from './multimedia-message-tooltip-button.react';
import { navigateToSidebar } from './sidebar-navigation';

export type MultimediaMessageTooltipModalParams = TooltipParams<{
  +item: ChatMultimediaMessageInfoItem,
  +verticalBounds: VerticalBounds,
}>;

const confirmReport = () => displayActionResultModal('reported to admin');
const spec = {
  entries: [
    {
      id: 'create_sidebar',
      text: 'Create sidebar',
      onPress: navigateToSidebar,
    },
    {
      id: 'open_sidebar',
      text: 'Go to sidebar',
      onPress: navigateToSidebar,
    },
    {
      id: 'report',
      text: 'Report',
      onPress: confirmReport,
    },
  ],
};

const MultimediaMessageTooltipModal: React.ComponentType<
  BaseTooltipProps<'MultimediaMessageTooltipModal'>,
> = createTooltip<'MultimediaMessageTooltipModal'>(
  MultimediaMessageTooltipButton,
  spec,
);

const MultimediaMessageTooltipHeight: number = tooltipHeight(
  spec.entries.length,
);

export { MultimediaMessageTooltipModal, MultimediaMessageTooltipHeight };
