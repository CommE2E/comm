// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useDispatch } from 'react-redux';

import { useWatchThread, threadIsPending } from 'lib/shared/thread-utils.js';

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
  const {
    isChatCreation,
    selectedUserIDs,
    otherUserInfos,
    userInfoInputArray,
    setUserInfoInputArray,
  } = useInfosForPendingThread();

  React.useEffect(() => {
    if (!isChatCreation) {
      setUserInfoInputArray([]);
    }
    // TODO: Check here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChatCreation]);

  const threadInfo = useThreadInfoForPossiblyPendingThread(activeChatThreadID);
  invariant(threadInfo, 'ThreadInfo should be set');

  const dispatch = useDispatch();
  React.useEffect(() => {
    if (!isChatCreation) {
      return;
    }
    const newSelectedUserIDs = userInfoInputArray.map(user => user.id);
    if (_isEqual(new Set(selectedUserIDs), new Set(newSelectedUserIDs))) {
      return;
    }
    const payload = {
      selectedUserList: newSelectedUserIDs,
    };
    dispatch({
      type: updateNavInfoActionType,
      payload,
    });
  }, [dispatch, isChatCreation, selectedUserIDs, userInfoInputArray]);

  React.useEffect(() => {
    if (!isChatCreation) {
      return;
    }
    if (activeChatThreadID === threadInfo?.id) {
      return;
    }
    let payload = {
      activeChatThreadID: threadInfo?.id,
    };
    if (threadIsPending(threadInfo?.id)) {
      payload = {
        ...payload,
        pendingThread: threadInfo,
      };
    }
    dispatch({
      type: updateNavInfoActionType,
      payload,
    });
  }, [activeChatThreadID, dispatch, isChatCreation, threadInfo]);

  const inputState = React.useContext(InputStateContext);
  invariant(inputState, 'InputState should be set');
  const [{ isActive }, connectDropTarget] = useDrop({
    accept: NativeTypes.FILE,
    drop: item => {
      const { files } = item;
      if (inputState && files.length > 0) {
        inputState.appendFiles(files);
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

  const containerRef = React.useRef();

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
      inputState.appendFiles([...files]);
    },
    [inputState],
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
        userInfoInputArray={userInfoInputArray}
        setUserInfoInputArray={setUserInfoInputArray}
        otherUserInfos={otherUserInfos}
        threadID={threadInfo.id}
        inputState={inputState}
      />
    );

    if (!userInfoInputArray.length) {
      return chatUserSelection;
    }
    return (
      <>
        {topBar}
        {chatUserSelection}
        {messageListAndInput}
      </>
    );
  }, [
    inputState,
    isChatCreation,
    otherUserInfos,
    setUserInfoInputArray,
    threadInfo,
    userInfoInputArray,
  ]);

  return connectDropTarget(
    <div className={containerStyle} ref={containerRef}>
      {content}
    </div>,
  );
}

export default ChatMessageListContainer;
