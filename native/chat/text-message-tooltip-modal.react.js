// @flow

import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, StackActions } from '@react-navigation/native';
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
import { OverlayContext } from '../navigation/overlay-context.js';
import {
  TextMessageTooltipModalRouteName,
  MultimediaMessageTooltipModalRouteName,
  TogglePinModalRouteName,
} from '../navigation/route-names.js';
import {
  createTooltip,
  type TooltipParams,
  type BaseTooltipProps,
  type TooltipMenuProps,
} from '../tooltip/tooltip.react.js';
import type { ChatTextMessageInfoItemWithHeight } from '../types/chat-types.js';
import { exitEditAlert } from '../utils/edit-messages-utils.js';

export type TextMessageTooltipModalParams = TooltipParams<{
  +item: ChatTextMessageInfoItemWithHeight,
}>;

const confirmCopy = () => displayActionResultModal('copied!');

function TooltipMenu(
  props: TooltipMenuProps<'TextMessageTooltipModal'>,
): React.Node {
  const { route, tooltipItem: TooltipItem } = props;
  const navigation = useNavigation();

  const overlayContext = React.useContext(OverlayContext);
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
    const updateInputBar = () => {
      inputState.editInputMessage({
        message: text,
        mode: 'replace',
      });
    };
    const enterEditMode = () => {
      inputState.setEditedMessage(messageInfo, updateInputBar);
    };
    if (inputState.editState.editedMessage) {
      exitEditAlert(enterEditMode);
    } else {
      enterEditMode();
    }
  }, [inputState, messageInfo, text]);
  const renderEditIcon = React.useCallback(
    style => <SWMansionIcon name="edit-1" style={style} size={16} />,
    [],
  );

  const onPressTogglePin = React.useCallback(() => {
    // If the most recent overlay is the tooltip modal, prior to opening the
    // toggle pin modal, we want to dismiss it so the overlay is not visible
    // once the toggle pin modal is closed. This is also necessary with the
    // TetxMessageTooltipModal, since otherwise the toggle pin modal fails to
    // render the message since we 'hide' the original message and
    // show another message on top when the tooltip is active, and this
    // state carries through into the modal.
    const mostRecentOverlay = overlayContext?.visibleOverlays.slice(-1)[0];
    const routeName = mostRecentOverlay?.routeName;
    const routeKey = mostRecentOverlay?.routeKey;
    if (
      routeName === TextMessageTooltipModalRouteName ||
      routeName === MultimediaMessageTooltipModalRouteName
    ) {
      navigation.dispatch({
        ...StackActions.replace(TogglePinModalRouteName, {
          threadInfo: route.params.item.threadInfo,
          item: route.params.item,
        }),
        source: routeKey,
      });
    }
  }, [navigation, overlayContext, route.params.item]);
  const renderPinIcon = React.useCallback(
    style => <CommIcon name="pin" style={style} size={16} />,
    [],
  );
  const renderUnpinIcon = React.useCallback(
    style => <CommIcon name="unpin" style={style} size={16} />,
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
