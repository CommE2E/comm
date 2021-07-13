// @flow

import {
  createTooltip,
  tooltipHeight,
  type TooltipParams,
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

const MultimediaMessageTooltipModal = createTooltip<
  'MultimediaMessageTooltipModal',
>(MultimediaMessageTooltipButton, spec);

const multimediaMessageTooltipHeight = tooltipHeight(spec.entries.length);

export { MultimediaMessageTooltipModal, multimediaMessageTooltipHeight };
