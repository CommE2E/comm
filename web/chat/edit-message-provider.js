// @flow

import invariant from 'invariant';
import * as React from 'react';

import ModalOverlay from 'lib/components/modal-overlay.react.js';
import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import type { ThreadInfo } from 'lib/types/thread-types';

export type EditState = {
  +messageInfo: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +editedMessageDraft: ?string,
  +isError: boolean,
};

type EditModalContextType = {
  +renderEditModal: (params: EditState) => void,
  +clearEditModal: () => void,
  +editState: ?EditState,
  +setDraft: string => void,
  +setError: boolean => void,
};

const EditModalContext: React.Context<EditModalContextType> =
  React.createContext<EditModalContextType>({
    renderEditModal: () => {},
    clearEditModal: () => {},
    editState: null,
    setDraft: () => {},
    setError: () => {},
  });

type Props = {
  +children: React.Node,
};
function EditModalProvider(props: Props): React.Node {
  const { children } = props;

  const [editState, setEditState] = React.useState<?EditState>(null);

  const clearEditModal = React.useCallback(() => {
    setEditState(null);
  }, []);

  const renderEditModal = React.useCallback((newEditState: EditState): void => {
    setEditState(newEditState);
  }, []);

  const modal = React.useMemo(() => {
    // TODO: Add modal
    return null;
  }, []);

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
      if (!editState) {
        return;
      }
      setEditState({
        ...editState,
        isError,
      });
    },
    [editState, setEditState],
  );
  const value = React.useMemo(
    () => ({
      renderEditModal,
      clearEditModal: clearEditModal,
      editState,
      setDraft,
      setError,
    }),
    [renderEditModal, clearEditModal, editState, setDraft, setError],
  );

  const modalOverlay = React.useMemo(() => {
    if (!modal) {
      return null;
    }
    return <ModalOverlay onClose={clearEditModal}>{modal}</ModalOverlay>;
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
