// @flow

import * as React from 'react';

import useModal from './use-modal.react';

type Props = {
  +children: React.Node,
};

type ModalContextType = {
  +setModal: (component?: React.Node) => void,
  +clearModal: () => void,
  +modal: ?React.Node,
};

const ModalContext: React.Context<?ModalContextType> = React.createContext<?ModalContextType>(
  { modal: null, clearModal: () => {}, setModal: () => {} },
);

function ModalProvider(props: Props): React.Node {
  const { children } = props;
  const { setModal, modal, clearModal } = useModal();

  const modalContext = React.useMemo(
    () => ({
      setModal,
      clearModal,
      modal,
    }),
    [setModal, modal, clearModal],
  );
  return (
    <ModalContext.Provider value={modalContext}>
      {children}
    </ModalContext.Provider>
  );
}

export { ModalContext, ModalProvider };
