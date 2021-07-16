// @flow

import * as React from 'react';

import {
  createTooltip,
  tooltipHeight,
  type TooltipParams,
  type BaseTooltipProps,
} from '../navigation/tooltip.react';
import type { VerticalBounds } from '../types/layout-types';
import MultimediaMessageTooltipButton from './multimedia-message-tooltip-button.react';
import type { ChatMultimediaMessageInfoItem } from './multimedia-message-utils';
import { navigateToSidebar } from './sidebar-navigation';

export type MultimediaMessageTooltipModalParams = TooltipParams<{|
  +item: ChatMultimediaMessageInfoItem,
  +verticalBounds: VerticalBounds,
|}>;

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
  ],
};

const MultimediaMessageTooltipModal: React.ComponentType<
  BaseTooltipProps<'MultimediaMessageTooltipModal'>,
> = createTooltip<'MultimediaMessageTooltipModal'>(
  MultimediaMessageTooltipButton,
  spec,
);

const multimediaMessageTooltipHeight: number = tooltipHeight(
  spec.entries.length,
);

export { MultimediaMessageTooltipModal, multimediaMessageTooltipHeight };
