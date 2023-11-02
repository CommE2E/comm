// @flow

import FocusTrap from 'focus-trap-react';
import * as React from 'react';

import css from './modal-overlay.css';

type ModalOverlayProps = {
  +onClose: () => void,
  +children?: React.Node,
  +backgroundColor?: string,
};

const focusTrapOptions = {
  fallbackFocus: '#modal-overlay',
  allowOutsideClick: true,
};

function ModalOverlay(props: ModalOverlayProps): React.Node {
  const {
    children,
    onClose,
    backgroundColor = 'var(--modal-overlay-background-90)',
  } = props;

  const overlayRef = React.useRef<?HTMLDivElement>();
  const firstClickRef = React.useRef<?EventTarget>(null);

  React.useLayoutEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.focus();
    }
  }, []);

  const onBackgroundMouseDown = React.useCallback(
    (event: SyntheticEvent<HTMLDivElement>) => {
      firstClickRef.current = event.target;
    },
    [],
  );

  const onBackgroundMouseUp = React.useCallback(
    (event: SyntheticEvent<HTMLDivElement>) => {
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
    (event: SyntheticKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  const containerStyle = React.useMemo(
    () => ({
      backgroundColor,
    }),
    [backgroundColor],
  );

  return (
    <FocusTrap focusTrapOptions={focusTrapOptions}>
      <div
        id="modal-overlay"
        className={css.modalOverlay}
        ref={overlayRef}
        onMouseDown={onBackgroundMouseDown}
        onMouseUp={onBackgroundMouseUp}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={containerStyle}
      >
        {children}
      </div>
    </FocusTrap>
  );
}

export default ModalOverlay;
