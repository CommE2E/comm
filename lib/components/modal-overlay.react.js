// @flow

import FocusTrap from 'focus-trap-react';
import * as React from 'react';

import css from './modal-overlay.css';

type ModalOverlayProps = {
  +onClose: () => void,
  +children?: React.Node,
  +disableAutoFocus?: boolean,
  +backgroundColor?: string,
};

function ModalOverlay(props: ModalOverlayProps): React.Node {
  const {
    children,
    onClose,
    disableAutoFocus,
    backgroundColor = 'var(--modal-overlay-background-90)',
  } = props;

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
    <div
      className={css.modalOverlay}
      ref={overlayRef}
      onMouseDown={onBackgroundMouseDown}
      onMouseUp={onBackgroundMouseUp}
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={containerStyle}
    >
      <FocusTrap>{children}</FocusTrap>
    </div>
  );
}

export default ModalOverlay;
