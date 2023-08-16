// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useResettingState } from 'lib/hooks/use-resetting-state.js';
import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { useCanEditMessage } from 'lib/shared/edit-messages-utils.js';
import { createMessageReply } from 'lib/shared/message-utils.js';
import { useCanCreateReactionFromMessage } from 'lib/shared/reaction-utils.js';
import {
  threadHasPermission,
  useSidebarExistsOrCanBeCreated,
} from 'lib/shared/thread-utils.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import { isComposableMessageType } from 'lib/types/message-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { longAbsoluteDate } from 'lib/utils/date-utils.js';

import {
  type MessageTooltipAction,
  findTooltipPosition,
  getTooltipStyle,
  calculateTooltipSize,
  type TooltipSize,
  type TooltipPosition,
} from './tooltip-utils.js';
import { getComposedMessageID } from '../chat/chat-constants.js';
import { useEditModalContext } from '../chat/edit-message-provider.js';
import MessageTooltip from '../chat/message-tooltip.react.js';
import type { PositionInfo } from '../chat/position-types.js';
import { useTooltipContext } from '../chat/tooltip-provider.js';
import CommIcon from '../CommIcon.react.js';
import { InputStateContext } from '../input/input-state.js';
import TogglePinModal from '../modals/chat/toggle-pin-modal.react.js';
import {
  useOnClickPendingSidebar,
  useOnClickThread,
} from '../selectors/thread-selectors.js';

function useMessageTooltipSidebarAction(
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
): ?MessageTooltipAction {
  const { threadCreatedFromMessage, messageInfo } = item;
  const { popModal } = useModalContext();
  const sidebarExists = !!threadCreatedFromMessage;
  const sidebarExistsOrCanBeCreated = useSidebarExistsOrCanBeCreated(
    threadInfo,
    item,
  );
  const openThread = useOnClickThread(threadCreatedFromMessage);
  const openPendingSidebar = useOnClickPendingSidebar(messageInfo, threadInfo);
  return React.useMemo(() => {
    if (!sidebarExistsOrCanBeCreated) {
      return null;
    }
    const buttonContent = <CommIcon icon="sidebar-filled" size={16} />;
    const onClick = (event: SyntheticEvent<HTMLElement>) => {
      popModal();

      if (threadCreatedFromMessage) {
        openThread(event);
      } else {
        openPendingSidebar(event);
      }
    };
    return {
      actionButtonContent: buttonContent,
      onClick,
      label: sidebarExists ? 'Go to thread' : 'Create thread',
    };
  }, [
    popModal,
    openPendingSidebar,
    openThread,
    sidebarExists,
    sidebarExistsOrCanBeCreated,
    threadCreatedFromMessage,
  ]);
}

function useMessageTooltipReplyAction(
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
): ?MessageTooltipAction {
  const { messageInfo } = item;
  const { popModal } = useModalContext();
  const inputState = React.useContext(InputStateContext);
  invariant(inputState, 'inputState is required');
  const { addReply } = inputState;
  return React.useMemo(() => {
    if (
      item.messageInfo.type !== messageTypes.TEXT ||
      !threadHasPermission(threadInfo, threadPermissions.VOICED)
    ) {
      return null;
    }
    const buttonContent = <CommIcon icon="reply-filled" size={18} />;
    const onClick = () => {
      popModal();

      if (!messageInfo.text) {
        return;
      }
      addReply(createMessageReply(messageInfo.text));
    };
    return {
      actionButtonContent: buttonContent,
      onClick,
      label: 'Reply',
    };
  }, [popModal, addReply, item.messageInfo.type, messageInfo, threadInfo]);
}

const copiedMessageDurationMs = 2000;
function useMessageCopyAction(
  item: ChatMessageInfoItem,
): ?MessageTooltipAction {
  const { messageInfo } = item;

  const [successful, setSuccessful] = useResettingState(
    false,
    copiedMessageDurationMs,
  );

  return React.useMemo(() => {
    if (messageInfo.type !== messageTypes.TEXT) {
      return null;
    }
    const buttonContent = <CommIcon icon="copy-filled" size={18} />;
    const onClick = async () => {
      try {
        await navigator.clipboard.writeText(messageInfo.text);
        setSuccessful(true);
      } catch (e) {
        setSuccessful(false);
      }
    };
    return {
      actionButtonContent: buttonContent,
      onClick,
      label: successful ? 'Copied!' : 'Copy',
    };
  }, [messageInfo.text, messageInfo.type, setSuccessful, successful]);
}

function useMessageReactAction(
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
): ?MessageTooltipAction {
  const { messageInfo } = item;

  const { setShouldRenderEmojiKeyboard } = useTooltipContext();

  const canCreateReactionFromMessage = useCanCreateReactionFromMessage(
    threadInfo,
    messageInfo,
  );

  return React.useMemo(() => {
    if (!canCreateReactionFromMessage) {
      return null;
    }

    const buttonContent = <CommIcon icon="emote-smile-filled" size={18} />;

    const onClickReact = () => {
      if (!setShouldRenderEmojiKeyboard) {
        return;
      }
      setShouldRenderEmojiKeyboard(true);
    };

    return {
      actionButtonContent: buttonContent,
      onClick: onClickReact,
      label: 'React',
    };
  }, [canCreateReactionFromMessage, setShouldRenderEmojiKeyboard]);
}

function useMessageTogglePinAction(
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
): ?MessageTooltipAction {
  const { pushModal } = useModalContext();
  const { messageInfo, isPinned } = item;

  const canTogglePin =
    isComposableMessageType(messageInfo.type) &&
    threadHasPermission(threadInfo, threadPermissions.MANAGE_PINS);

  const inputState = React.useContext(InputStateContext);

  return React.useMemo(() => {
    if (!canTogglePin) {
      return null;
    }

    const iconName = isPinned ? 'unpin' : 'pin';

    const buttonContent = <CommIcon icon={iconName} size={18} />;

    const onClickTogglePin = () => {
      pushModal(
        <InputStateContext.Provider value={inputState}>
          <TogglePinModal item={item} threadInfo={threadInfo} />
        </InputStateContext.Provider>,
      );
    };

    return {
      actionButtonContent: buttonContent,
      onClick: onClickTogglePin,
      label: isPinned ? 'Unpin' : 'Pin',
    };
  }, [canTogglePin, inputState, isPinned, pushModal, item, threadInfo]);
}

function useMessageEditAction(
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
): ?MessageTooltipAction {
  const { messageInfo } = item;

  const canEditMessage = useCanEditMessage(threadInfo, messageInfo);
  const { renderEditModal, scrollToMessage } = useEditModalContext();
  const { clearTooltip } = useTooltipContext();

  return React.useMemo(() => {
    if (!canEditMessage) {
      return null;
    }
    const buttonContent = <CommIcon icon="edit-filled" size={18} />;
    const onClickEdit = () => {
      const callback = (maxHeight: number) =>
        renderEditModal({
          messageInfo: item,
          threadInfo,
          isError: false,
          editedMessageDraft: messageInfo.text,
          maxHeight: maxHeight,
        });
      clearTooltip();
      scrollToMessage(getComposedMessageID(messageInfo), callback);
    };
    return {
      actionButtonContent: buttonContent,
      onClick: onClickEdit,
      label: 'Edit',
    };
  }, [
    canEditMessage,
    clearTooltip,
    item,
    messageInfo,
    renderEditModal,
    scrollToMessage,
    threadInfo,
  ]);
}

function useMessageTooltipActions(
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
): $ReadOnlyArray<MessageTooltipAction> {
  const sidebarAction = useMessageTooltipSidebarAction(item, threadInfo);
  const replyAction = useMessageTooltipReplyAction(item, threadInfo);
  const copyAction = useMessageCopyAction(item);
  const reactAction = useMessageReactAction(item, threadInfo);
  const togglePinAction = useMessageTogglePinAction(item, threadInfo);
  const editAction = useMessageEditAction(item, threadInfo);
  return React.useMemo(
    () =>
      [
        replyAction,
        sidebarAction,
        copyAction,
        reactAction,
        togglePinAction,
        editAction,
      ].filter(Boolean),
    [
      replyAction,
      sidebarAction,
      copyAction,
      reactAction,
      togglePinAction,
      editAction,
    ],
  );
}

type UseMessageTooltipArgs = {
  +availablePositions: $ReadOnlyArray<TooltipPosition>,
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};

type UseMessageTooltipResult = {
  onMouseEnter: (event: SyntheticEvent<HTMLElement>) => void,
  onMouseLeave: ?() => mixed,
};

type GetTooltipPositionStyleParams = {
  +tooltipSourcePosition: ?PositionInfo,
  +tooltipSize: TooltipSize,
  +availablePositions: $ReadOnlyArray<TooltipPosition>,
  +preventDisplayingBelowSource?: boolean,
};

function getTooltipPositionStyle(params: GetTooltipPositionStyleParams) {
  const {
    tooltipSourcePosition,
    tooltipSize,
    availablePositions,
    preventDisplayingBelowSource,
  } = params;
  if (!tooltipSourcePosition) {
    return undefined;
  }
  const tooltipPosition = findTooltipPosition({
    sourcePositionInfo: tooltipSourcePosition,
    tooltipSize,
    availablePositions,
    defaultPosition: availablePositions[0],
    preventDisplayingBelowSource,
  });
  if (!tooltipPosition) {
    return undefined;
  }

  const tooltipPositionStyle = getTooltipStyle({
    tooltipPosition,
    sourcePositionInfo: tooltipSourcePosition,
    tooltipSize,
  });

  return tooltipPositionStyle;
}

function useMessageTooltip({
  availablePositions,
  item,
  threadInfo,
}: UseMessageTooltipArgs): UseMessageTooltipResult {
  const [onMouseLeave, setOnMouseLeave] = React.useState<?() => mixed>(null);

  const { renderTooltip } = useTooltipContext();
  const tooltipActions = useMessageTooltipActions(item, threadInfo);

  const containsInlineEngagement = !!item.threadCreatedFromMessage;

  const messageTimestamp = React.useMemo(() => {
    const time = item.messageInfo.time;
    return longAbsoluteDate(time);
  }, [item.messageInfo.time]);

  const tooltipSize = React.useMemo(() => {
    if (typeof document === 'undefined') {
      return {
        width: 0,
        height: 0,
      };
    }
    const tooltipLabels = tooltipActions.map(action => action.label);
    return calculateTooltipSize({
      tooltipLabels,
      timestamp: messageTimestamp,
    });
  }, [messageTimestamp, tooltipActions]);

  const updateTooltip = React.useRef();
  const [tooltipMessagePosition, setTooltipMessagePosition] = React.useState();

  const onMouseEnter = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      if (!renderTooltip) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const { top, bottom, left, right, height, width } = rect;
      const messagePosition = { top, bottom, left, right, height, width };
      setTooltipMessagePosition(messagePosition);

      const tooltipPositionStyle = getTooltipPositionStyle({
        tooltipSourcePosition: messagePosition,
        tooltipSize,
        availablePositions,
        preventDisplayingBelowSource: containsInlineEngagement,
      });

      if (!tooltipPositionStyle) {
        return;
      }

      const tooltip = (
        <MessageTooltip
          actions={tooltipActions}
          messageTimestamp={messageTimestamp}
          tooltipPositionStyle={tooltipPositionStyle}
          tooltipSize={tooltipSize}
          item={item}
          threadInfo={threadInfo}
        />
      );
      const renderTooltipResult = renderTooltip({
        newNode: tooltip,
        tooltipPositionStyle,
      });
      if (renderTooltipResult) {
        const { onMouseLeaveCallback: callback } = renderTooltipResult;
        setOnMouseLeave((() => callback: () => () => mixed));
        updateTooltip.current = renderTooltipResult.updateTooltip;
      }
    },
    [
      availablePositions,
      containsInlineEngagement,
      item,
      messageTimestamp,
      renderTooltip,
      threadInfo,
      tooltipActions,
      tooltipSize,
    ],
  );

  React.useEffect(() => {
    if (!updateTooltip.current) {
      return;
    }

    const tooltipPositionStyle = getTooltipPositionStyle({
      tooltipSourcePosition: tooltipMessagePosition,
      tooltipSize,
      availablePositions,
      preventDisplayingBelowSource: containsInlineEngagement,
    });
    if (!tooltipPositionStyle) {
      return;
    }

    const tooltip = (
      <MessageTooltip
        actions={tooltipActions}
        messageTimestamp={messageTimestamp}
        tooltipPositionStyle={tooltipPositionStyle}
        tooltipSize={tooltipSize}
        item={item}
        threadInfo={threadInfo}
      />
    );

    updateTooltip.current?.(tooltip);
  }, [
    availablePositions,
    containsInlineEngagement,
    item,
    messageTimestamp,
    threadInfo,
    tooltipActions,
    tooltipMessagePosition,
    tooltipSize,
  ]);

  return {
    onMouseEnter,
    onMouseLeave,
  };
}

export {
  useMessageTooltipSidebarAction,
  useMessageTooltipReplyAction,
  useMessageReactAction,
  useMessageTooltipActions,
  useMessageTooltip,
};
