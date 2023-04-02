// @flow

import invariant from 'invariant';
import _debounce from 'lodash/debounce.js';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { createMessageReply } from 'lib/shared/message-utils.js';
import { useCanCreateReactionFromMessage } from 'lib/shared/reaction-utils.js';
import {
  threadHasPermission,
  useSidebarExistsOrCanBeCreated,
} from 'lib/shared/thread-utils.js';
import {
  isComposableMessageType,
  messageTypes,
} from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { threadPermissions } from 'lib/types/thread-types.js';
import { longAbsoluteDate } from 'lib/utils/date-utils.js';

import {
  type MessageTooltipAction,
  findTooltipPosition,
  getMessageActionTooltipStyle,
  calculateTooltipSize,
  type TooltipSize,
  type TooltipPosition,
} from './tooltip-utils.js';
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
  const inputState = React.useContext(InputStateContext);
  invariant(inputState, 'inputState is required');
  const { addReply } = inputState;
  return React.useMemo(() => {
    if (
      !isComposableMessageType(item.messageInfo.type) ||
      !threadHasPermission(threadInfo, threadPermissions.VOICED)
    ) {
      return null;
    }
    const buttonContent = <CommIcon icon="reply-filled" size={18} />;
    const onClick = () => {
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
  }, [addReply, item.messageInfo.type, messageInfo, threadInfo]);
}

const copiedMessageDurationMs = 2000;
function useMessageCopyAction(
  item: ChatMessageInfoItem,
): ?MessageTooltipAction {
  const { messageInfo } = item;

  const [successful, setSuccessful] = React.useState(false);
  const resetStatusAfterTimeout = React.useRef(
    _debounce(() => setSuccessful(false), copiedMessageDurationMs),
  );

  const onSuccess = React.useCallback(() => {
    setSuccessful(true);
    resetStatusAfterTimeout.current();
  }, []);

  React.useEffect(() => resetStatusAfterTimeout.current.cancel, []);

  return React.useMemo(() => {
    if (messageInfo.type !== messageTypes.TEXT) {
      return null;
    }
    const buttonContent = <CommIcon icon="copy-filled" size={18} />;
    const onClick = async () => {
      try {
        await navigator.clipboard.writeText(messageInfo.text);
        onSuccess();
      } catch (e) {
        setSuccessful(false);
      }
    };
    return {
      actionButtonContent: buttonContent,
      onClick,
      label: successful ? 'Copied!' : 'Copy',
    };
  }, [messageInfo.text, messageInfo.type, onSuccess, successful]);
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

  return React.useMemo(() => {
    if (!canTogglePin) {
      return null;
    }

    const iconName = isPinned ? 'unpin' : 'pin';

    const buttonContent = <CommIcon icon={iconName} size={18} />;

    const onClickTogglePin = () => {
      pushModal(<TogglePinModal item={item} threadInfo={threadInfo} />);
    };

    return {
      actionButtonContent: buttonContent,
      onClick: onClickTogglePin,
      label: isPinned ? 'Unpin' : 'Pin',
    };
  }, [canTogglePin, isPinned, pushModal, item, threadInfo]);
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
  return React.useMemo(
    () =>
      [
        replyAction,
        sidebarAction,
        copyAction,
        reactAction,
        togglePinAction,
      ].filter(Boolean),
    [replyAction, sidebarAction, copyAction, reactAction, togglePinAction],
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

type CreateTooltipParams = {
  +tooltipMessagePosition: ?PositionInfo,
  +tooltipSize: TooltipSize,
  +availablePositions: $ReadOnlyArray<TooltipPosition>,
  +containsInlineEngagement: boolean,
  +tooltipActions: $ReadOnlyArray<MessageTooltipAction>,
  +messageTimestamp: string,
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};

function createTooltip(params: CreateTooltipParams) {
  const {
    tooltipMessagePosition,
    tooltipSize,
    availablePositions,
    containsInlineEngagement,
    tooltipActions,
    messageTimestamp,
    item,
    threadInfo,
  } = params;
  if (!tooltipMessagePosition) {
    return;
  }
  const tooltipPosition = findTooltipPosition({
    sourcePositionInfo: tooltipMessagePosition,
    tooltipSize,
    availablePositions,
    defaultPosition: availablePositions[0],
    preventDisplayingBelowSource: containsInlineEngagement,
  });
  if (!tooltipPosition) {
    return;
  }

  const tooltipPositionStyle = getMessageActionTooltipStyle({
    tooltipPosition,
    sourcePositionInfo: tooltipMessagePosition,
    tooltipSize,
  });

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
  return { tooltip, tooltipPositionStyle };
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

      const tooltipResult = createTooltip({
        tooltipMessagePosition,
        tooltipSize,
        availablePositions,
        containsInlineEngagement,
        tooltipActions,
        messageTimestamp,
        item,
        threadInfo,
      });
      if (!tooltipResult) {
        return;
      }

      const { tooltip, tooltipPositionStyle } = tooltipResult;
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
      tooltipMessagePosition,
      tooltipSize,
    ],
  );

  React.useEffect(() => {
    if (!updateTooltip.current) {
      return;
    }

    const tooltipResult = createTooltip({
      tooltipMessagePosition,
      tooltipSize,
      availablePositions,
      containsInlineEngagement,
      tooltipActions,
      messageTimestamp,
      item,
      threadInfo,
    });
    if (!tooltipResult) {
      return;
    }

    updateTooltip.current?.(tooltipResult.tooltip);
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
