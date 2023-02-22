// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useDispatch } from 'react-redux';

import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { userInfoSelectorForPotentialMembers } from 'lib/selectors/user-selectors.js';
import {
  useWatchThread,
  useExistingThreadInfoFinder,
  createPendingThread,
  threadIsPending,
} from 'lib/shared/thread-utils.js';
import { threadTypes } from 'lib/types/thread-types.js';

import { InputStateContext } from '../input/input-state.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import ChatInputBar from './chat-input-bar.react.js';
import css from './chat-message-list-container.css';
import ChatMessageList from './chat-message-list.react.js';
import ChatThreadComposer from './chat-thread-composer.react.js';
import ThreadTopBar from './thread-top-bar.react.js';

type Props = {
  +activeChatThreadID: string,
};

function ChatMessageListContainer(props: Props): React.Node {
  const { activeChatThreadID } = props;
  const isChatCreation =
    useSelector(state => state.navInfo.chatMode) === 'create';

  const selectedUserIDs = useSelector(
    state => state.navInfo.selectedUserList ?? [],
  );
  const otherUserInfos = useSelector(userInfoSelectorForPotentialMembers);
  const [userInfoInputArray, setUserInfoInputArray] = React.useState(() =>
    selectedUserIDs.map(id => otherUserInfos[id]).filter(Boolean),
  );

  React.useEffect(() => {
    if (!isChatCreation) {
      setUserInfoInputArray([]);
    }
  }, [isChatCreation]);

  const loggedInUserInfo = useLoggedInUserInfo();
  invariant(loggedInUserInfo, 'loggedInUserInfo should be set');

  const pendingPrivateThread = React.useRef(
    createPendingThread({
      viewerID: loggedInUserInfo.id,
      threadType: threadTypes.PRIVATE,
      members: [loggedInUserInfo],
    }),
  );

  const newThreadID = 'pending/new_thread';
  const pendingNewThread = React.useMemo(
    () => ({
      ...createPendingThread({
        viewerID: loggedInUserInfo.id,
        threadType: threadTypes.PRIVATE,
        members: [loggedInUserInfo],
        name: 'New thread',
      }),
      id: newThreadID,
    }),
    [loggedInUserInfo],
  );

  const existingThreadInfoFinderForCreatingThread = useExistingThreadInfoFinder(
    pendingPrivateThread.current,
  );

  const baseThreadInfo = useSelector(state => {
    if (!activeChatThreadID) {
      return null;
    }
    return (
      threadInfoSelector(state)[activeChatThreadID] ??
      state.navInfo.pendingThread
    );
  });
  const existingThreadInfoFinder = useExistingThreadInfoFinder(baseThreadInfo);
  const threadInfo = React.useMemo(() => {
    if (isChatCreation) {
      if (userInfoInputArray.length === 0) {
        return pendingNewThread;
      }

      return existingThreadInfoFinderForCreatingThread({
        searching: true,
        userInfoInputArray,
      });
    }

    return existingThreadInfoFinder({
      searching: false,
      userInfoInputArray: [],
    });
  }, [
    existingThreadInfoFinder,
    existingThreadInfoFinderForCreatingThread,
    isChatCreation,
    userInfoInputArray,
    pendingNewThread,
  ]);
  invariant(threadInfo, 'ThreadInfo should be set');

  const dispatch = useDispatch();
  React.useEffect(() => {
    if (isChatCreation) {
      let payload = {};

      const newSelectedUserIDs = userInfoInputArray.map(user => user.id);
      if (!_isEqual(new Set(selectedUserIDs), new Set(newSelectedUserIDs))) {
        payload = {
          ...payload,
          selectedUserList: newSelectedUserIDs,
        };
      }

      if (activeChatThreadID !== threadInfo?.id) {
        payload = {
          ...payload,
          activeChatThreadID: threadInfo?.id,
        };
        if (threadIsPending(threadInfo?.id)) {
          payload = {
            ...payload,
            pendingThread: threadInfo,
          };
        }
      }

      dispatch({
        type: updateNavInfoActionType,
        payload,
      });
    }
  }, [
    activeChatThreadID,
    dispatch,
    isChatCreation,
    selectedUserIDs,
    threadInfo,
    userInfoInputArray,
  ]);

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
      return;
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
        existingThreadInfoFinderForCreatingThread={
          existingThreadInfoFinderForCreatingThread
        }
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
    existingThreadInfoFinderForCreatingThread,
    inputState,
    isChatCreation,
    otherUserInfos,
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
