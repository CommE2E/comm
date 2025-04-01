// @flow

import Clipboard from '@react-native-clipboard/clipboard';
import invariant from 'invariant';
import * as React from 'react';

import { createMessageReply } from 'lib/shared/message-utils.js';
import { useDeleteMessage } from 'lib/utils/delete-message-utils.js';

import { MessageEditingContext } from './message-editing-context.react.js';
import { useNavigateToThread } from './message-list-types.js';
import { useOnPressReport } from './message-report-utils.js';
import { useAnimatedNavigateToSidebar } from './sidebar-navigation.js';
import TextMessageTooltipButton from './text-message-tooltip-button.react.js';
import CommIcon from '../components/comm-icon.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { InputStateContext } from '../input/input-state.js';
import { displayActionResultModal } from '../navigation/action-result-modal.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import {
  createTooltip,
  type TooltipParams,
  type TooltipProps,
  type TooltipMenuProps,
} from '../tooltip/tooltip.react.js';
import type { ChatTextMessageInfoItemWithHeight } from '../types/chat-types.js';
import type { TextStyle } from '../types/styles.js';
import { exitEditAlert } from '../utils/edit-messages-utils.js';
import { useNavigateToPinModal } from '../utils/toggle-pin-utils.js';

export type TextMessageTooltipModalParams = TooltipParams<{
  +item: ChatTextMessageInfoItemWithHeight,
}>;

const confirmCopy = () => displayActionResultModal('copied!');

function TooltipMenu(
  props: TooltipMenuProps<'TextMessageTooltipModal'>,
): React.Node {
  const { route, tooltipItem: TooltipItem, navigation } = props;
  const { threadInfo } = route.params.item;

  const overlayContext = React.useContext(OverlayContext);
  const inputState = React.useContext(InputStateContext);
  const { text } = route.params.item.messageInfo;
  const navigateToThread = useNavigateToThread();

  const onPressReply = React.useCallback(() => {
    invariant(
      inputState,
      'inputState should be set in TextMessageTooltipModal.onPressReply',
    );
    navigateToThread({ threadInfo });
    inputState.editInputMessage({
      message: createMessageReply(text),
      mode: 'prepend',
    });
  }, [inputState, navigateToThread, threadInfo, text]);
  const renderReplyIcon = React.useCallback(
    (style: TextStyle) => <CommIcon name="reply" style={style} size={12} />,
    [],
  );

  const onPressSidebar = useAnimatedNavigateToSidebar(route.params.item);
  const renderSidebarIcon = React.useCallback(
    (style: TextStyle) => (
      <SWMansionIcon name="message-circle-lines" style={style} size={16} />
    ),
    [],
  );

  const messageEditingContext = React.useContext(MessageEditingContext);

  const { messageInfo } = route.params.item;
  const onPressEdit = React.useCallback(() => {
    invariant(
      inputState && messageEditingContext,
      'inputState and messageEditingContext should be set in ' +
        'TextMessageTooltipModal.onPressEdit',
    );
    const updateInputBar = () => {
      inputState.editInputMessage({
        message: text,
        mode: 'replace',
      });
    };
    const enterEditMode = () => {
      messageEditingContext.setEditedMessage(messageInfo, updateInputBar);
    };
    const { editedMessage, isEditedMessageChanged } =
      messageEditingContext.editState;
    if (isEditedMessageChanged && editedMessage) {
      exitEditAlert({
        onDiscard: enterEditMode,
      });
    } else {
      enterEditMode();
    }
  }, [inputState, messageEditingContext, messageInfo, text]);
  const renderEditIcon = React.useCallback(
    (style: TextStyle) => (
      <SWMansionIcon name="edit-1" style={style} size={16} />
    ),
    [],
  );

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

  const onPressCopy = React.useCallback(() => {
    Clipboard.setString(text);
    setTimeout(confirmCopy);
  }, [text]);
  const renderCopyIcon = React.useCallback(
    (style: TextStyle) => <SWMansionIcon name="copy" style={style} size={16} />,
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
    await deleteMessage(messageInfo);
    navigation.goBackOnce();
  }, [deleteMessage, messageInfo, navigation]);
  const renderDeleteIcon = React.useCallback(
    (style: TextStyle) => (
      <SWMansionIcon name="trash-2" style={style} size={16} />
    ),
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

const TextMessageTooltipModal: React.ComponentType<
  TooltipProps<'TextMessageTooltipModal'>,
> = createTooltip<'TextMessageTooltipModal'>(
  TextMessageTooltipButton,
  TooltipMenu,
);

export default TextMessageTooltipModal;
