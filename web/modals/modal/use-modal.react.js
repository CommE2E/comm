// @flow

import * as React from 'react';

function useModal(): {
  modal?: React.Node,
  clearModal: () => void,
  handleModal: () => void,
} {
  const [modal, setModal] = React.useState(null);
  const handleModal = React.useCallback(() => {
    setModal(modal);
  }, [modal]);
  const clearModal = React.useCallback(() => {
    setModal(null);
  }, []);

  return { modal, handleModal, clearModal };
}

export default useModal;
