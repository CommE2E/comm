// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';

import { useOnPressReport } from './message-report-utils.js';
import MultimediaMessageTooltipButton from './multimedia-message-tooltip-button.react.js';
import { useAnimatedNavigateToSidebar } from './sidebar-navigation.js';
import CommIcon from '../components/comm-icon.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { TogglePinModalRouteName } from '../navigation/route-names.js';
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
  const navigation = useNavigation();

  const onPressTogglePin = React.useCallback(() => {
    navigation.navigate<'TogglePinModal'>({
      name: TogglePinModalRouteName,
      params: {
        threadInfo: route.params.item.threadInfo,
        item: route.params.item,
      },
    });
  }, [navigation, route.params.item]);
  const renderPinIcon = React.useCallback(
    style => <CommIcon name="pin" style={style} size={16} />,
    [],
  );
  const renderUnpinIcon = React.useCallback(
    style => <CommIcon name="pin" style={style} size={16} />,
    [],
  );

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
        id="pin"
        text="Pin"
        onPress={onPressTogglePin}
        renderIcon={renderPinIcon}
        key="pin"
      />
      <TooltipItem
        id="unpin"
        text="Unpin"
        onPress={onPressTogglePin}
        renderIcon={renderUnpinIcon}
        key="unpin"
      />
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
