// @flow

import * as React from 'react';

import { useOnPressReport } from './message-report-utils.js';
import MultimediaMessageTooltipButton from './multimedia-message-tooltip-button.react.js';
import { useAnimatedNavigateToSidebar } from './sidebar-navigation.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import {
  createTooltip,
  type TooltipParams,
  type BaseTooltipProps,
  type TooltipMenuProps,
} from '../tooltip/tooltip.react.js';
import type { ChatMultimediaMessageInfoItem } from '../types/chat-types.js';
import type { VerticalBounds } from '../types/layout-types.js';

export type MultimediaMessageTooltipModalParams = TooltipParams<{
  +item: ChatMultimediaMessageInfoItem,
  +verticalBounds: VerticalBounds,
}>;

function TooltipMenu(
  props: TooltipMenuProps<'MultimediaMessageTooltipModal'>,
): React.Node {
  const { route, tooltipItem: TooltipItem } = props;

  const onPressSidebar = useAnimatedNavigateToSidebar(route.params.item);
  const renderSidebarIcon = React.useCallback(
    style => (
      <SWMansionIcon name="message-circle-lines" style={style} size={16} />
    ),
    [],
  );

  const onPressReport = useOnPressReport(route);
  const renderReportIcon = React.useCallback(
    style => <SWMansionIcon name="warning-circle" style={style} size={16} />,
    [],
  );

  return (
    <>
      <TooltipItem
        id="sidebar"
        text="Thread"
        onPress={onPressSidebar}
        renderIcon={renderSidebarIcon}
        key="sidebar"
      />
      <TooltipItem
        id="report"
        text="Report"
        onPress={onPressReport}
        renderIcon={renderReportIcon}
        key="report"
      />
    </>
  );
}

const MultimediaMessageTooltipModal: React.ComponentType<
  BaseTooltipProps<'MultimediaMessageTooltipModal'>,
> = createTooltip<'MultimediaMessageTooltipModal'>(
  MultimediaMessageTooltipButton,
  TooltipMenu,
);

export default MultimediaMessageTooltipModal;
