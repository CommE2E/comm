// @flow

import invariant from 'invariant';
import * as React from 'react';

import ModalOverlay from 'lib/components/modal-overlay.react.js';
import type { ComposableChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import { EditTextMessage } from './edit-text-message.react.js';

export type ModalPosition = {
  +left: number,
  +top: number,
  +width: number,
  +height: number,
};

export type EditState = {
  +messageInfo: ComposableChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +editedMessageDraft: ?string,
  +isError: boolean,
  +position?: ModalPosition,
  +maxHeight: number,
};

export type ScrollToMessageCallback = (
  composedMessageID: string,
  callback: (maxHeight: number) => void,
) => void;

type EditModalContextType = {
  +renderEditModal: (params: EditState) => void,
  +clearEditModal: () => void,
  +editState: ?EditState,
  +setDraft: string => void,
  +setError: boolean => void,
  +updatePosition: ModalPosition => void,
  +scrollToMessage: ScrollToMessageCallback,
  +addScrollToMessageListener: ScrollToMessageCallback => void,
  +removeScrollToMessageListener: ScrollToMessageCallback => void,
};

const EditModalContext: React.Context<EditModalContextType> =
  React.createContext<EditModalContextType>({
    renderEditModal: () => {},
    clearEditModal: () => {},
    editState: null,
    setDraft: () => {},
    setError: () => {},
    updatePosition: () => {},
    scrollToMessage: () => {},
    addScrollToMessageListener: () => {},
    removeScrollToMessageListener: () => {},
  });

type Props = {
  +children: React.Node,
};
function EditModalProvider(props: Props): React.Node {
  const { children } = props;

  const [editState, setEditState] = React.useState<?EditState>(null);

  const [scrollToMessageCallbacks, setScrollToMessageCallbacks] =
    React.useState<Array<ScrollToMessageCallback>>([]);

  const clearEditModal = React.useCallback(() => {
    setEditState(null);
  }, []);

  const renderEditModal = React.useCallback((newEditState: EditState): void => {
    setEditState(newEditState);
  }, []);

  const modal = React.useMemo(() => {
    if (!editState || !editState.position) {
      return null;
    }

    const tooltipNode = (
      <EditTextMessage
        item={editState.messageInfo}
        threadInfo={editState.threadInfo}
        background={false}
      />
    );

    const tooltipContainerStyle = {
      position: 'fixed',
      left: editState.position.left,
      top: editState.position.top,
      width: editState.position.width,
      height: editState.position.height,
    };

    return <div style={tooltipContainerStyle}>{tooltipNode}</div>;
  }, [editState]);

  const setDraft = React.useCallback(
    (draft: ?string) => {
      if (!editState) {
        return;
      }
      setEditState({
        ...editState,
        editedMessageDraft: draft,
      });
    },
    [editState, setEditState],
  );

  const setError = React.useCallback(
    (isError: boolean) => {
      invariant(editState, 'editState should be set in setError');
      setEditState({
        ...editState,
        isError,
      });
    },
    [editState, setEditState],
  );

  const updatePosition = React.useCallback(
    (position: ModalPosition) => {
      invariant(editState, 'editState should be set in updatePosition');
      setEditState({
        ...editState,
        position,
      });
    },
    [editState, setEditState],
  );

  const scrollToMessage: ScrollToMessageCallback = React.useCallback(
    (messageKey: string, callback: (maxHeight: number) => void) => {
      scrollToMessageCallbacks.forEach((callback2: ScrollToMessageCallback) =>
        callback2(messageKey, callback),
      );
    },
    [scrollToMessageCallbacks],
  );

  const addScrollToMessageListener = React.useCallback(
    (callback: ScrollToMessageCallback): void => {
      setScrollToMessageCallbacks(prevScrollToMessageCallbacks => [
        ...prevScrollToMessageCallbacks,
        callback,
      ]);
    },
    [],
  );

  const removeScrollToMessageListener = React.useCallback(
    (callback: ScrollToMessageCallback) => {
      setScrollToMessageCallbacks(prevScrollToMessageCallbacks =>
        prevScrollToMessageCallbacks.filter(
          candidate => candidate !== callback,
        ),
      );
    },
    [],
  );

  const value = React.useMemo(
    () => ({
      renderEditModal,
      clearEditModal: clearEditModal,
      editState,
      setDraft,
      setError,
      updatePosition,
      scrollToMessage,
      addScrollToMessageListener,
      removeScrollToMessageListener,
    }),
    [
      renderEditModal,
      clearEditModal,
      editState,
      setDraft,
      setError,
      updatePosition,
      scrollToMessage,
      addScrollToMessageListener,
      removeScrollToMessageListener,
    ],
  );

  const modalOverlay = React.useMemo(() => {
    if (!modal) {
      return null;
    }
    return (
      <ModalOverlay
        onClose={clearEditModal}
        backgroundColor="var(--modal-overlay-background-80)"
      >
        {modal}
      </ModalOverlay>
    );
  }, [clearEditModal, modal]);

  return (
    <EditModalContext.Provider value={value}>
      {children}
      {modalOverlay}
    </EditModalContext.Provider>
  );
}

function useEditModalContext(): EditModalContextType {
  const context = React.useContext(EditModalContext);
  invariant(context, 'EditModalContext not found');
  return context;
}

export { EditModalProvider, useEditModalContext };
