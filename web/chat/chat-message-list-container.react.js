// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useDispatch } from 'react-redux';

import { userInfoSelectorForPotentialMembers } from 'lib/selectors/user-selectors.js';
import { useWatchThread, threadIsPending } from 'lib/shared/thread-utils.js';
import type { AccountUserInfo } from 'lib/types/user-types.js';

import ChatInputBar from './chat-input-bar.react.js';
import css from './chat-message-list-container.css';
import ChatMessageList from './chat-message-list.react.js';
import ChatThreadComposer from './chat-thread-composer.react.js';
import ThreadTopBar from './thread-top-bar.react.js';
import { InputStateContext } from '../input/input-state.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { useThreadInfoForPossiblyPendingThread } from '../utils/thread-utils.js';

type Props = {
  +activeChatThreadID: string,
};

function ChatMessageListContainer(props: Props): React.Node {
  const { activeChatThreadID } = props;
  const isChatCreation =
    useSelector(state => state.navInfo.chatMode) === 'create';

  const selectedUserIDs = useSelector(state => state.navInfo.selectedUserList);
  const otherUserInfos = useSelector(userInfoSelectorForPotentialMembers);
  const userInfoInputArray: $ReadOnlyArray<AccountUserInfo> = React.useMemo(
    () => selectedUserIDs?.map(id => otherUserInfos[id]).filter(Boolean) ?? [],
    [otherUserInfos, selectedUserIDs],
  );
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  invariant(viewerID, 'should be set');

  const threadInfo = useThreadInfoForPossiblyPendingThread({
    activeChatThreadID,
  });
  invariant(threadInfo, 'ThreadInfo should be set');

  const dispatch = useDispatch();

  // The effect removes members from list in navInfo
  // if some of the user IDs don't exist in redux store
  React.useEffect(() => {
    if (!isChatCreation) {
      return;
    }
    const existingSelectedUsersSet = new Set(
      userInfoInputArray.map(userInfo => userInfo.id),
    );
    if (
      selectedUserIDs?.length !== existingSelectedUsersSet.size ||
      !_isEqual(new Set(selectedUserIDs), existingSelectedUsersSet)
    ) {
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          selectedUserList: Array.from(existingSelectedUsersSet),
        },
      });
    }
  }, [
    dispatch,
    isChatCreation,
    otherUserInfos,
    selectedUserIDs,
    userInfoInputArray,
  ]);

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
