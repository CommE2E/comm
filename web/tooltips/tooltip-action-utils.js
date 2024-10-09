// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { useENSNames } from 'lib/hooks/ens-cache.js';
import { useResettingState } from 'lib/hooks/use-resetting-state.js';
import type {
  ChatMessageInfoItem,
  ReactionInfo,
} from 'lib/selectors/chat-selectors.js';
import {
  chatMessageInfoItemTimestamp,
  chatMessageItemEngagementTargetMessageInfo,
} from 'lib/shared/chat-message-item-utils.js';
import { useCanEditMessage } from 'lib/shared/edit-messages-utils.js';
import { createMessageReply } from 'lib/shared/message-utils.js';
import { useCanCreateReactionFromMessage } from 'lib/shared/reaction-utils.js';
import { useSidebarExistsOrCanBeCreated } from 'lib/shared/sidebar-utils.js';
import { useThreadHasPermission } from 'lib/shared/thread-utils.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { useCanToggleMessagePin } from 'lib/utils/message-pinning-utils.js';

import LabelTooltip from './label-toolitp.react.js';
import MessageTooltip from './message-tooltip.react.js';
import ReactionTooltip from './reaction-tooltip.react.js';
import { useTooltipContext } from './tooltip-provider.js';
import {
  calculateLabelTooltipSize,
  calculateMessageTooltipSize,
  calculateReactionTooltipSize,
  getTooltipPositionStyle,
  type MessageTooltipAction,
  type TooltipPosition,
  type TooltipPositionStyle,
  type TooltipSize,
} from './tooltip-utils.js';
import { getComposedMessageID } from '../chat/chat-constants.js';
import { useEditModalContext } from '../chat/edit-message-provider.js';
import type { PositionInfo } from '../chat/position-types.js';
import CommIcon from '../comm-icon.react.js';
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
};
type UseTooltipResult = {
  +onMouseEnter: (event: SyntheticEvent<HTMLElement>) => mixed,
  +onMouseLeave: ?() => mixed,
};

function useTooltip({
  createTooltip,
  tooltipSize,
  availablePositions,
}: UseTooltipArgs): UseTooltipResult {
  const [onMouseLeave, setOnMouseLeave] = React.useState<?() => mixed>(null);
  const [tooltipSourcePosition, setTooltipSourcePosition] =
    React.useState<?PositionInfo>();

  const { renderTooltip } = useTooltipContext();
  const updateTooltip = React.useRef<?(React.Node) => mixed>();

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
    [availablePositions, createTooltip, renderTooltip, tooltipSize],
  );

  React.useEffect(() => {
    if (!updateTooltip.current) {
      return;
    }

    const tooltipPositionStyle = getTooltipPositionStyle({
      tooltipSourcePosition,
      tooltipSize,
      availablePositions,
    });
    if (!tooltipPositionStyle) {
      return;
    }

    const tooltip = createTooltip(tooltipPositionStyle);
    updateTooltip.current?.(tooltip);
  }, [availablePositions, createTooltip, tooltipSize, tooltipSourcePosition]);

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
  const currentUserIsVoiced = useThreadHasPermission(
    threadInfo,
    threadPermissions.VOICED,
  );
  return React.useMemo(() => {
    if (item.messageInfo.type !== messageTypes.TEXT || !currentUserIsVoiced) {
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
  }, [
    popModal,
    addReply,
    item.messageInfo.type,
    messageInfo,
    currentUserIsVoiced,
  ]);
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
  const { isPinned } = item;

  const engagementTargetMessageInfo =
    chatMessageItemEngagementTargetMessageInfo(item);
  const canTogglePin = useCanToggleMessagePin(
    engagementTargetMessageInfo,
    threadInfo,
  );

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
    invariant(
      item.messageInfoType === 'composable',
      'canEditMessage should only be true for composable messages!',
    );
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

const undefinedTooltipSize = {
  width: 0,
  height: 0,
};

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

  const messageTimestamp = chatMessageInfoItemTimestamp(item);

  const tooltipSize = React.useMemo(() => {
    if (typeof document === 'undefined') {
      return undefinedTooltipSize;
    }
    const tooltipLabels = tooltipActions.map(action => action.label);
    return calculateMessageTooltipSize({
      tooltipLabels,
      timestamp: messageTimestamp,
    });
  }, [messageTimestamp, tooltipActions]);

  const createMessageTooltip = React.useCallback(
    (tooltipPositionStyle: TooltipPositionStyle) => (
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
  });

  return {
    onMouseEnter,
    onMouseLeave,
  };
}

const useENSNamesOptions = { allAtOnce: true };

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
  const { users } = reactions[reaction];

  const resolvedUsers = useENSNames(users, useENSNamesOptions);

  const showSeeMoreText = resolvedUsers.length > 5;

  const usernamesToShow = resolvedUsers
    .map(user => user.username)
    .filter(Boolean)
    .slice(0, 5);

  const tooltipSize = React.useMemo(() => {
    if (typeof document === 'undefined') {
      return undefinedTooltipSize;
    }

    return calculateReactionTooltipSize(usernamesToShow, showSeeMoreText);
  }, [showSeeMoreText, usernamesToShow]);

  const createReactionTooltip = React.useCallback(
    () => (
      <ReactionTooltip
        reactions={reactions}
        usernames={usernamesToShow}
        showSeeMoreText={showSeeMoreText}
      />
    ),
    [reactions, showSeeMoreText, usernamesToShow],
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

type UseLabelTooltipArgs = {
  +tooltipLabel: string,
  +position: TooltipPosition,
  // The margin size should be between the point of origin and
  // the base of the tooltip. The arrow is a "decoration" and
  // should not be considered when measuring the margin size.
  +tooltipMargin: number,
};

function useLabelTooltip({
  tooltipLabel,
  position,
  tooltipMargin,
}: UseLabelTooltipArgs): UseTooltipResult {
  const tooltipSize = React.useMemo(() => {
    if (typeof document === 'undefined') {
      return undefinedTooltipSize;
    }

    return calculateLabelTooltipSize(tooltipLabel, position, tooltipMargin);
  }, [position, tooltipLabel, tooltipMargin]);

  const createLabelTooltip = React.useCallback(
    () => (
      <LabelTooltip
        tooltipLabel={tooltipLabel}
        position={position}
        tooltipMargin={tooltipMargin}
      />
    ),
    [position, tooltipLabel, tooltipMargin],
  );

  const { onMouseEnter, onMouseLeave } = useTooltip({
    createTooltip: createLabelTooltip,
    tooltipSize,
    availablePositions: [position],
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
  useLabelTooltip,
};
