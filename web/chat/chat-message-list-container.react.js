// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useDispatch } from 'react-redux';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { userInfoSelectorForPotentialMembers } from 'lib/selectors/user-selectors';
import {
  useWatchThread,
  useExistingThreadInfoFinder,
  createPendingThread,
  threadIsPending,
} from 'lib/shared/thread-utils';
import { threadTypes } from 'lib/types/thread-types';

import { InputStateContext } from '../input/input-state';
import { updateNavInfoActionType } from '../redux/action-types';
import { useSelector } from '../redux/redux-utils';
import ChatInputBar from './chat-input-bar.react';
import css from './chat-message-list-container.css';
import ChatMessageList from './chat-message-list.react';
import ChatThreadComposer from './chat-thread-composer.react';
import ThreadTopBar from './thread-top-bar.react';

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

  const dispatch = useDispatch();
  React.useEffect(() => {
    if (isChatCreation) {
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          selectedUserList: userInfoInputArray.map(user => user.id),
        },
      });
    }
  }, [dispatch, isChatCreation, userInfoInputArray]);

  const viewerID = useSelector(state => state.currentUserInfo?.id);
  invariant(viewerID, 'should be set');

  const pendingPrivateThread = React.useRef(
    createPendingThread({
      viewerID,
      threadType: threadTypes.PRIVATE,
    }),
  );

  const newThreadID = 'pending/new_thread';
  const pendingNewThread = React.useMemo(
    () => ({
      ...createPendingThread({
        viewerID,
        threadType: threadTypes.PRIVATE,
        name: 'New thread',
      }),
      id: newThreadID,
    }),
    [viewerID],
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

  React.useEffect(() => {
    if (isChatCreation && activeChatThreadID !== threadInfo?.id) {
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
    }
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
