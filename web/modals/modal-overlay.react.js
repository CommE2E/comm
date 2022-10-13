// @flow

import * as React from 'react';

import css from './modal-overlay.css';

type ModalOverlayProps = {
  +onClose: () => void,
  +children?: React.Node,
};

function ModalOverlay(props: ModalOverlayProps): React.Node {
  const { children, onClose } = props;

  const overlayRef = React.useRef();
  const firstClickRef = React.useRef(null);

  const onBackgroundMouseDown = React.useCallback(event => {
    firstClickRef.current = event.target;
  }, []);

  const onBackgroundMouseUp = React.useCallback(
    event => {
      if (
        event.target === overlayRef.current &&
        firstClickRef.current === overlayRef.current
      ) {
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

  React.useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.focus();
    }
  }, []);

  return (
    <div
      className={css.modalOverlay}
      ref={overlayRef}
      onMouseDown={onBackgroundMouseDown}
      onMouseUp={onBackgroundMouseUp}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}

export default ModalOverlay;
