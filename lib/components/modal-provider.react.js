// @flow

import invariant from 'invariant';
import * as React from 'react';

import { getUUID } from '../utils/uuid.js';

export type PushModal = React.Node => string;

type Props = {
  +children: React.Node,
};
type ModalContextType = {
  +modals: $ReadOnlyArray<[React.Node, string]>,
  +pushModal: PushModal,
  +popModal: () => void,
  +clearModals: () => void,
};

const ModalContext: React.Context<?ModalContextType> =
  React.createContext<?ModalContextType>({
    modals: [],
    pushModal: () => '',
    popModal: () => {},
    clearModals: () => {},
  });

function ModalProvider(props: Props): React.Node {
  const { children } = props;
  const [modals, setModals] = React.useState<
    $ReadOnlyArray<[React.Node, string]>,
  >([]);
  const popModal = React.useCallback(
    () => setModals(oldModals => oldModals.slice(0, -1)),
    [],
  );
  const pushModal = React.useCallback(newModal => {
    const key = getUUID();
    setModals(oldModals => [...oldModals, [newModal, key]]);
    return key;
  }, []);

  const clearModals = React.useCallback(() => setModals([]), []);

  const value = React.useMemo(
    () => ({
      modals,
      pushModal,
      popModal,
      clearModals,
    }),
    [modals, pushModal, popModal, clearModals],
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}

function useModalContext(): ModalContextType {
  const context = React.useContext(ModalContext);
  invariant(context, 'ModalContext not found');

  return context;
}

export { ModalProvider, useModalContext };
