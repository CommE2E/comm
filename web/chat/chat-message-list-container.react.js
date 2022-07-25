// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import {
  useWatchThread,
  useExistingThreadInfoFinder,
} from 'lib/shared/thread-utils';

import { InputStateContext } from '../input/input-state';
import { useSelector } from '../redux/redux-utils';
import ChatInputBar from './chat-input-bar.react';
import css from './chat-message-list-container.css';
import ChatMessageList from './chat-message-list.react';
import ThreadTopBar from './thread-top-bar.react';

function ChatMessageListContainer(): React.Node {
  const activeChatThreadID = useSelector(
    state => state.navInfo.activeChatThreadID,
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
  const threadInfo = React.useMemo(
    () =>
      existingThreadInfoFinder({
        searching: false,
        userInfoInputArray: [],
      }),
    [existingThreadInfoFinder],
  );
  invariant(threadInfo, 'ThreadInfo should be set');

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

  return connectDropTarget(
    <div className={containerStyle} ref={containerRef}>
      <ThreadTopBar threadInfo={threadInfo} />
      <ChatMessageList threadInfo={threadInfo} />
      <ChatInputBar threadInfo={threadInfo} inputState={inputState} />
    </div>,
  );
}

export default ChatMessageListContainer;
