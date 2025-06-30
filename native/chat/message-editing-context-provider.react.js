// @flow

import * as React from 'react';

import type { MessageInfo } from 'lib/types/message-types.js';

import {
  type EditState,
  MessageEditingContext,
} from './message-editing-context.react.js';

const defaultEditState = {
  editedMessage: null,
  isEditedMessageChanged: false,
};

type Props = {
  +children: React.Node,
};
function MessageEditingContextProvider(props: Props): React.Node {
  const [editState, setEditState] = React.useState<EditState>(defaultEditState);

  const pendingCallbacksRef = React.useRef<Array<() => void>>([]);

  const setEditedMessage = React.useCallback(
    (editedMessage: ?MessageInfo, callback?: () => void) => {
      if (callback) {
        pendingCallbacksRef.current.push(callback);
      }
      setEditState({ editedMessage, isEditedMessageChanged: false });
    },
    [],
  );

  React.useEffect(() => {
    if (pendingCallbacksRef.current.length === 0) {
      return;
    }
    for (const callback of pendingCallbacksRef.current) {
      callback();
    }
    pendingCallbacksRef.current = [];
  }, [editState]);

  const setEditedMessageChanged = React.useCallback(
    (isEditedMessageChanged: boolean) => {
      setEditState(prevEditState => {
        if (prevEditState.isEditedMessageChanged === isEditedMessageChanged) {
          return prevEditState;
        }
        return {
          ...prevEditState,
          isEditedMessageChanged,
        };
      });
    },
    [],
  );

  const contextValue = React.useMemo(
    () => ({
      editState,
      setEditedMessage,
      setEditedMessageChanged,
    }),
    [editState, setEditedMessage, setEditedMessageChanged],
  );

  return (
    <MessageEditingContext.Provider value={contextValue}>
      {props.children}
    </MessageEditingContext.Provider>
  );
}

const MemoizedMessageEditingContextProvider: React.ComponentType<Props> =
  React.memo(MessageEditingContextProvider);

export default MemoizedMessageEditingContextProvider;
