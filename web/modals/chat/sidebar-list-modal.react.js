// @flow

import * as React from 'react';

import css from '../../style.css';
import Modal from '../modal.react';

type Props = {|
  +setModal: (modal: ?React.Node) => void,
|};
function SidebarsListModal(props: Props) {
  const { setModal } = props;

  const clearModal = React.useCallback(() => {
    setModal(null);
  }, [setModal]);

  return (
    <Modal name="Sidebars" onClose={clearModal}>
      <div className={css['modal-body']}>
        <p>Sidebars will be displayed here</p>
      </div>
    </Modal>
  );
}

export default SidebarsListModal;
