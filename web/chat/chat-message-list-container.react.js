// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';

import { useRefreshFarcasterConversation } from 'lib/shared/farcaster/farcaster-hooks.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import { threadSpecs } from 'lib/shared/threads/thread-specs.js';
import { useWatchThread } from 'lib/shared/watch-thread-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import ChatInputBar from './chat-input-bar.react.js';
import css from './chat-message-list-container.css';
import ChatMessageList from './chat-message-list.react.js';
import ChatThreadComposer from './chat-thread-composer.react.js';
import ThreadTopBar from './thread-top-bar.react.js';
import { InputStateContext } from '../input/input-state.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import {
  useThreadInfoForPossiblyPendingThread,
  useInfosForPendingThread,
} from '../utils/thread-utils.js';

type Props = {
  +activeChatThreadID: ?string,
};

function ChatMessageListContainer(props: Props): React.Node {
  const { activeChatThreadID } = props;
  const { isChatCreation, selectedUserInfos } = useInfosForPendingThread();

  const threadInfo = useThreadInfoForPossiblyPendingThread(activeChatThreadID);
  invariant(threadInfo, 'ThreadInfo should be set');

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (isChatCreation && activeChatThreadID !== threadInfo.id) {
      let payload = {
        activeChatThreadID: threadInfo.id,
      };
      if (threadIsPending(threadInfo.id)) {
        payload = {
          ...payload,
          pendingThread: threadInfo,
        };
      }
      dispatch({
        type: updateNavInfoActionType,
        payload,
      });
    }
  }, [activeChatThreadID, dispatch, isChatCreation, threadInfo]);

  const inputState = React.useContext(InputStateContext);
  invariant(inputState, 'InputState should be set');
  const [{ isActive }, connectDropTarget] = useDrop({
    accept: NativeTypes.FILE,
    drop: item => {
      const { files } = item;
      if (inputState && files.length > 0) {
        void inputState.appendFiles(threadInfo, files);
      }
    },
    collect: monitor => ({
      isActive: monitor.isOver() && monitor.canDrop(),
    }),
  });

  useWatchThread(threadInfo);

  const containerStyle = classNames({
    [css.container]: true,
    [css.activeContainer]: isActive,
  });

  const containerRef = React.useRef<?HTMLDivElement>();

  const onPaste = React.useCallback(
    (e: ClipboardEvent) => {
      if (!inputState) {
        return;
      }
      const { clipboardData } = e;
      if (!clipboardData) {
        return;
      }
      const { files } = clipboardData;
      if (files.length === 0) {
        return;
      }
      e.preventDefault();
      void inputState.appendFiles(threadInfo, [...files]);
    },
    [inputState, threadInfo],
  );

  React.useEffect(() => {
    const currentContainerRef = containerRef.current;
    if (!currentContainerRef) {
      return undefined;
    }
    currentContainerRef.addEventListener('paste', onPaste);
    return () => {
      currentContainerRef.removeEventListener('paste', onPaste);
    };
  }, [onPaste]);

  const content = React.useMemo(() => {
    const topBar = <ThreadTopBar threadInfo={threadInfo} />;
    const messageListAndInput = (
      <>
        <ChatMessageList threadInfo={threadInfo} />
        <ChatInputBar threadInfo={threadInfo} inputState={inputState} />
      </>
    );
    if (!isChatCreation) {
      return (
        <>
          {topBar}
          {messageListAndInput}
        </>
      );
    }
    const chatUserSelection = (
      <ChatThreadComposer
        userInfoInputArray={selectedUserInfos}
        threadID={threadInfo.id}
        inputState={inputState}
      />
    );

    if (!selectedUserInfos.length) {
      return chatUserSelection;
    }
    return (
      <>
        {topBar}
        {chatUserSelection}
        {messageListAndInput}
      </>
    );
  }, [inputState, isChatCreation, selectedUserInfos, threadInfo]);

  const prevActiveThreadID = React.useRef(activeChatThreadID);
  const farcasterRefreshConversation = useRefreshFarcasterConversation();
  React.useEffect(() => {
    if (prevActiveThreadID !== activeChatThreadID && activeChatThreadID) {
      threadSpecs[threadInfo.type]
        .protocol()
        .onOpenThread?.(
          { threadID: activeChatThreadID },
          { farcasterRefreshConversation },
        );
      prevActiveThreadID.current = activeChatThreadID;
    }
  }, [farcasterRefreshConversation, activeChatThreadID, threadInfo.type]);

  return connectDropTarget(
    <div className={containerStyle} ref={containerRef}>
      {content}
    </div>,
  );
}

export default ChatMessageListContainer;
