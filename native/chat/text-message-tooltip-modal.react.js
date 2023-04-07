// @flow

import Clipboard from '@react-native-clipboard/clipboard';
import invariant from 'invariant';
import * as React from 'react';

import { createMessageReply } from 'lib/shared/message-utils.js';

import { useOnPressReport } from './message-report-utils.js';
import { useAnimatedNavigateToSidebar } from './sidebar-navigation.js';
import TextMessageTooltipButton from './text-message-tooltip-button.react.js';
import CommIcon from '../components/comm-icon.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { InputStateContext } from '../input/input-state.js';
import { displayActionResultModal } from '../navigation/action-result-modal.js';
import {
  createTooltip,
  type TooltipParams,
  type BaseTooltipProps,
  type TooltipMenuProps,
} from '../tooltip/tooltip.react.js';
import type { ChatTextMessageInfoItemWithHeight } from '../types/chat-types.js';

export type TextMessageTooltipModalParams = TooltipParams<{
  +item: ChatTextMessageInfoItemWithHeight,
}>;

const confirmCopy = () => displayActionResultModal('copied!');

function TooltipMenu(
  props: TooltipMenuProps<'TextMessageTooltipModal'>,
): React.Node {
  const { route, tooltipItem: TooltipItem } = props;

  const inputState = React.useContext(InputStateContext);
  const { text } = route.params.item.messageInfo;
  const onPressReply = React.useCallback(() => {
    invariant(
      inputState,
      'inputState should be set in TextMessageTooltipModal.onPressReply',
    );
    inputState.editInputMessage({
      message: createMessageReply(text),
      mode: 'prepend',
    });
  }, [inputState, text]);
  const renderReplyIcon = React.useCallback(
    style => <CommIcon name="reply" style={style} size={12} />,
    [],
  );

  const onPressSidebar = useAnimatedNavigateToSidebar(route.params.item);
  const renderSidebarIcon = React.useCallback(
    style => (
      <SWMansionIcon name="message-circle-lines" style={style} size={16} />
    ),
    [],
  );

  const { messageInfo } = route.params.item;
  const onPressEdit = React.useCallback(() => {
    invariant(
      inputState,
      'inputState should be set in TextMessageTooltipModal.onPressEdit',
    );
    inputState.setEditedMessageID(messageInfo.id);
  }, [inputState, messageInfo.id]);
  const renderEditIcon = React.useCallback(
    style => <SWMansionIcon name="edit-1" style={style} size={16} />,
    [],
  );

  const onPressCopy = React.useCallback(() => {
    Clipboard.setString(text);
    setTimeout(confirmCopy);
  }, [text]);
  const renderCopyIcon = React.useCallback(
    style => <SWMansionIcon name="copy" style={style} size={16} />,
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
        id="reply"
        text="Reply"
        onPress={onPressReply}
        renderIcon={renderReplyIcon}
        key="reply"
      />
      <TooltipItem
        id="sidebar"
        text="Thread"
        onPress={onPressSidebar}
        renderIcon={renderSidebarIcon}
        key="sidebar"
      />
      <TooltipItem
        id="edit"
        text="Edit"
        onPress={onPressEdit}
        renderIcon={renderEditIcon}
        key="edit"
      />
      <TooltipItem
        id="copy"
        text="Copy"
        onPress={onPressCopy}
        renderIcon={renderCopyIcon}
        key="copy"
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

const TextMessageTooltipModal: React.ComponentType<
  BaseTooltipProps<'TextMessageTooltipModal'>,
> = createTooltip<'TextMessageTooltipModal'>(
  TextMessageTooltipButton,
  TooltipMenu,
);

export default TextMessageTooltipModal;
