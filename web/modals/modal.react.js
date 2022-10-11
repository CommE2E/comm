// @flow

import classNames from 'classnames';
import * as React from 'react';

import Button from '../components/button.react';
import SWMansionIcon, { type Icon } from '../SWMansionIcon.react';
import css from './modal.css';

export type ModalSize = 'small' | 'large' | 'fit-content';

export type ModalOverridableProps = {
  +name: string,
  +icon?: Icon,
  +onClose: () => void,
  +withCloseButton?: boolean,
  +size?: ModalSize,
};

type ModalProps = {
  ...ModalOverridableProps,
  +children?: React.Node,
};

function Modal(props: ModalProps): React.Node {
  const {
    size = 'small',
    children,
    onClose,
    name,
    icon,
    withCloseButton = true,
  } = props;
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

  const modalContainerClasses = React.useMemo(
    () =>
      classNames(css.modalContainer, {
        [css.modalContainerLarge]: size === 'large',
        [css.modalContainerSmall]: size === 'small',
      }),
    [size],
  );

  const cornerCloseButton = React.useMemo(() => {
    if (!withCloseButton) {
      return null;
    }
    return (
      <Button className={css.modalClose} onClick={onClose}>
        <SWMansionIcon size={24} icon="cross" />
      </Button>
    );
  }, [onClose, withCloseButton]);

  const headerIcon = React.useMemo(() => {
    if (!icon) {
      return null;
    }
    return <SWMansionIcon size={24} icon={icon} />;
  }, [icon]);

  return (
    <div
      className={css.modalOverlay}
      ref={overlayRef}
      onMouseDown={onBackgroundMouseDown}
      onMouseUp={onBackgroundMouseUp}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className={modalContainerClasses}>
        <div className={css.modalHeader}>
          <h2 className={css.title}>
            {headerIcon}
            {name}
          </h2>
          {cornerCloseButton}
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
