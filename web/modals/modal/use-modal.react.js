// @flow

import * as React from 'react';

function useModal(): {
  modal?: React.Node,
  clearModal: () => void,
  setModal: () => void,
} {
  const [modal, setModal] = React.useState(null);
  const handleModal = React.useCallback(() => {
    setModal(modal);
  }, [modal]);
  const clearModal = React.useCallback(() => {
    setModal(null);
  }, []);

  return { modal, setModal: handleModal, clearModal };
}

export default useModal;
