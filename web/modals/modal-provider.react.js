// @flow

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
  const clearModal = React.useCallback(() => setModal(null), [setModal]);

  const handleClick = React.useCallback((component: ?React.Node) => {
    setModal(component);
  }, []);

  return (
    <ModalContext.Provider value={{ modal, clearModal, setModal: handleClick }}>
      {children}
    </ModalContext.Provider>
  );
}

export { ModalProvider, ModalContext };
