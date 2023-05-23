// @flow

import * as React from 'react';

import css from './modal-overlay.css';

type ModalOverlayProps = {
  +onClose: () => void,
  +children?: React.Node,
  +disableTab?: boolean,
  +disableAutoFocus?: boolean,
  +backgroundColor?: string,
};

function ModalOverlay(props: ModalOverlayProps): React.Node {
  const { children, onClose, disableTab, disableAutoFocus, backgroundColor } =
    props;

  const overlayRef = React.useRef();
  const firstClickRef = React.useRef(null);

  React.useLayoutEffect(() => {
    if (!disableAutoFocus && overlayRef.current) {
      overlayRef.current.focus();
    }
  }, [disableAutoFocus]);

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
      if (event.key === 'Escape') {
        onClose();
      }
      if (disableTab && event.key === 'Tab') {
        event.preventDefault();
      }
    },
    [disableTab, onClose],
  );

  return (
    <div
      className={css.modalOverlay}
      ref={overlayRef}
      onMouseDown={onBackgroundMouseDown}
      onMouseUp={onBackgroundMouseUp}
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{ backgroundColor: backgroundColor }}
    >
      {children}
    </div>
  );
}

export default ModalOverlay;
