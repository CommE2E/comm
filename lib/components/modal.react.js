// @flow

import * as React from 'react';

import css from './modal.css';

type ModalProps = {
  +onClose: () => void,
  +children?: React.Node,
};

function Modal(props: ModalProps): React.Node {
  const { children, onClose } = props;

  const overlayRef = React.useRef();

  React.useLayoutEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.focus();
    }
  }, []);

  const onBackgroundClick = React.useCallback(
    event => {
      if (event.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  const onKeyDown = React.useCallback(
    event => {
      if (event.keyCode === 27) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div
      className={css.modalOverlay}
      ref={overlayRef}
      onClick={onBackgroundClick}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}

export default Modal;
