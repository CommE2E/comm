// @flow

import invariant from 'invariant';
import * as React from 'react';

type Props = {
  +children: React.Node,
};
type ModalContextType = {
  +modal: ?React.Node,
  +setModal: (?React.Node) => void,
  +clearModal: () => void,
};

const ModalContext: React.Context<?ModalContextType> = React.createContext<?ModalContextType>(
  {
    modal: null,
    setModal: () => {},
    clearModal: () => {},
  },
);

function ModalProvider(props: Props): React.Node {
  const { children } = props;
  const [modal, setModal] = React.useState(null);
  const clearModal = React.useCallback(() => setModal(null), []);

  const value = React.useMemo(
    () => ({
      modal,
      setModal,
      clearModal,
    }),
    [modal, clearModal],
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
