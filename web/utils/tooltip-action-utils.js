// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useResettingState } from 'lib/hooks/use-resetting-state.js';
import type {
  ReactionInfo,
  ChatMessageInfoItem,
} from 'lib/selectors/chat-selectors.js';
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
  getTooltipPositionStyle,
  calculateMessageTooltipSize,
  calculateReactionTooltipSize,
  type TooltipPosition,
  type TooltipPositionStyle,
  type TooltipSize,
} from './tooltip-utils.js';
import { getComposedMessageID } from '../chat/chat-constants.js';
import { useEditModalContext } from '../chat/edit-message-provider.js';
import MessageTooltip from '../chat/message-tooltip.react.js';
import ReactionTooltip from '../chat/reaction-tooltip.react.js';
import { useTooltipContext } from '../chat/tooltip-provider.js';
import CommIcon from '../CommIcon.react.js';
import { InputStateContext } from '../input/input-state.js';
import TogglePinModal from '../modals/chat/toggle-pin-modal.react.js';
import {
  useOnClickPendingSidebar,
  useOnClickThread,
} from '../selectors/thread-selectors.js';

type UseTooltipArgs = {
  +createTooltip: (tooltipPositionStyle: TooltipPositionStyle) => React.Node,
  +tooltipSize: TooltipSize,
  +availablePositions: $ReadOnlyArray<TooltipPosition>,
  +preventDisplayingBelowSource?: boolean,
};
type UseTooltipResult = {
  +onMouseEnter: (event: SyntheticEvent<HTMLElement>) => mixed,
  +onMouseLeave: ?() => mixed,
};

function useTooltip({
  createTooltip,
  tooltipSize,
  availablePositions,
  preventDisplayingBelowSource,
}: UseTooltipArgs): UseTooltipResult {
  const [onMouseLeave, setOnMouseLeave] = React.useState<?() => mixed>(null);
  const [tooltipSourcePosition, setTooltipSourcePosition] = React.useState();

  const { renderTooltip } = useTooltipContext();
  const updateTooltip = React.useRef();

  const onMouseEnter = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      if (!renderTooltip) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const { top, bottom, left, right, height, width } = rect;
      const sourcePosition = { top, bottom, left, right, height, width };
      setTooltipSourcePosition(sourcePosition);

      const tooltipPositionStyle = getTooltipPositionStyle({
        tooltipSourcePosition: sourcePosition,
        tooltipSize,
        availablePositions,
        preventDisplayingBelowSource,
      });
      if (!tooltipPositionStyle) {
        return;
      }

      const tooltip = createTooltip(tooltipPositionStyle);

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
      createTooltip,
      preventDisplayingBelowSource,
      renderTooltip,
      tooltipSize,
    ],
  );

  React.useEffect(() => {
    if (!updateTooltip.current) {
      return;
    }

    const tooltipPositionStyle = getTooltipPositionStyle({
      tooltipSourcePosition,
      tooltipSize,
      availablePositions,
      preventDisplayingBelowSource,
    });
    if (!tooltipPositionStyle) {
      return;
    }

    const tooltip = createTooltip(tooltipPositionStyle);
    updateTooltip.current?.(tooltip);
  }, [
    availablePositions,
    createTooltip,
    preventDisplayingBelowSource,
    tooltipSize,
    tooltipSourcePosition,
  ]);

  return {
    onMouseEnter,
    onMouseLeave,
  };
}

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

function useMessageTooltip({
  availablePositions,
  item,
  threadInfo,
}: UseMessageTooltipArgs): UseTooltipResult {
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
    return calculateMessageTooltipSize({
      tooltipLabels,
      timestamp: messageTimestamp,
    });
  }, [messageTimestamp, tooltipActions]);

  const createMessageTooltip = React.useCallback(
    tooltipPositionStyle => (
      <MessageTooltip
        actions={tooltipActions}
        messageTimestamp={messageTimestamp}
        tooltipPositionStyle={tooltipPositionStyle}
        tooltipSize={tooltipSize}
        item={item}
        threadInfo={threadInfo}
      />
    ),
    [item, messageTimestamp, threadInfo, tooltipActions, tooltipSize],
  );

  const { onMouseEnter, onMouseLeave } = useTooltip({
    createTooltip: createMessageTooltip,
    tooltipSize,
    availablePositions,
    preventDisplayingBelowSource: containsInlineEngagement,
  });

  return {
    onMouseEnter,
    onMouseLeave,
  };
}

type UseReactionTooltipArgs = {
  +reaction: string,
  +reactions: ReactionInfo,
  +availablePositions: $ReadOnlyArray<TooltipPosition>,
};

function useReactionTooltip({
  reaction,
  reactions,
  availablePositions,
}: UseReactionTooltipArgs): UseTooltipResult {
  const users = reactions[reaction].users;

  const tooltipSize = React.useMemo(() => {
    if (typeof document === 'undefined') {
      return {
        width: 0,
        height: 0,
      };
    }

    const usernames = users.map(user => user.username).filter(Boolean);
    const { width, height } = calculateReactionTooltipSize(usernames);

    return {
      width,
      height,
    };
  }, [users]);

  const createReactionTooltip = React.useCallback(
    () => <ReactionTooltip reactions={reactions} reaction={reaction} />,
    [reaction, reactions],
  );

  const { onMouseEnter, onMouseLeave } = useTooltip({
    createTooltip: createReactionTooltip,
    tooltipSize,
    availablePositions,
  });

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
  useReactionTooltip,
};
