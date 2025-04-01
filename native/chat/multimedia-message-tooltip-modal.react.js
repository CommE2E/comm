// @flow

import * as React from 'react';

import { useDeleteMessage } from 'lib/utils/delete-message-utils.js';

import { useOnPressReport } from './message-report-utils.js';
import MultimediaMessageTooltipButton from './multimedia-message-tooltip-button.react.js';
import { useAnimatedNavigateToSidebar } from './sidebar-navigation.js';
import CommIcon from '../components/comm-icon.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import {
  createTooltip,
  type TooltipParams,
  type TooltipProps,
  type TooltipMenuProps,
} from '../tooltip/tooltip.react.js';
import type { ChatMultimediaMessageInfoItem } from '../types/chat-types.js';
import type { VerticalBounds } from '../types/layout-types.js';
import type { TextStyle } from '../types/styles.js';
import { useNavigateToPinModal } from '../utils/toggle-pin-utils.js';

export type MultimediaMessageTooltipModalParams = TooltipParams<{
  +item: ChatMultimediaMessageInfoItem,
  +verticalBounds: VerticalBounds,
}>;

function TooltipMenu(
  props: TooltipMenuProps<'MultimediaMessageTooltipModal'>,
): React.Node {
  const { route, tooltipItem: TooltipItem, navigation } = props;

  const overlayContext = React.useContext(OverlayContext);

  const onPressTogglePin = useNavigateToPinModal(overlayContext, route);

  const renderPinIcon = React.useCallback(
    (style: TextStyle) => (
      <CommIcon name="pin-outline" style={style} size={16} />
    ),
    [],
  );
  const renderUnpinIcon = React.useCallback(
    (style: TextStyle) => (
      <CommIcon name="unpin-outline" style={style} size={16} />
    ),
    [],
  );

  const onPressSidebar = useAnimatedNavigateToSidebar(route.params.item);
  const renderSidebarIcon = React.useCallback(
    (style: TextStyle) => (
      <SWMansionIcon name="message-circle-lines" style={style} size={16} />
    ),
    [],
  );

  const onPressReport = useOnPressReport(route);
  const renderReportIcon = React.useCallback(
    (style: TextStyle) => (
      <SWMansionIcon name="warning-circle" style={style} size={16} />
    ),
    [],
  );

  const deleteMessage = useDeleteMessage();
  const onPressDelete = React.useCallback(async () => {
    await deleteMessage(route.params.item.messageInfo);
    navigation.goBackOnce();
  }, [deleteMessage, navigation, route.params.item.messageInfo]);
  const renderDeleteIcon = React.useCallback(
    (style: TextStyle) => (
      <SWMansionIcon name="trash-2" style={style} size={16} />
    ),
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
      <TooltipItem
        id="delete"
        text="Delete"
        onPress={onPressDelete}
        renderIcon={renderDeleteIcon}
        key="delete"
      />
    </>
  );
}

const MultimediaMessageTooltipModal: React.ComponentType<
  TooltipProps<'MultimediaMessageTooltipModal'>,
> = createTooltip<'MultimediaMessageTooltipModal'>(
  MultimediaMessageTooltipButton,
  TooltipMenu,
);

export default MultimediaMessageTooltipModal;
