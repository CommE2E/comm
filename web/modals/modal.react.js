// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon, { type Icon } from '../SWMansionIcon.react';
import css from './modal.css';

export type ModalSize = 'small' | 'large';
type Props = {
  +name: React.Node,
  +icon?: Icon,
  +onClose: () => void,
  +withCloseButton?: boolean,
  +children?: React.Node,
  +size?: ModalSize,
  +fixedHeight?: boolean,
};

function Modal(props: Props): React.Node {
  const {
    size = 'small',
    children,
    onClose,
    fixedHeight,
    name,
    icon,
    withCloseButton = true,
  } = props;
  const overlayRef = React.useRef();

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

  React.useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.focus();
    }
  }, []);

  const overlayClasses = React.useMemo(
    () =>
      classNames(css['modal-overlay'], {
        [css['resizable-modal-overlay']]: !fixedHeight,
      }),
    [fixedHeight],
  );
  const modalContainerClasses = React.useMemo(
    () =>
      classNames(css['modal-container'], {
        [css['large-modal-container']]: size === 'large',
      }),
    [size],
  );
  const modalClasses = React.useMemo(
    () =>
      classNames(css['modal'], {
        [css['fixed-height-modal']]: fixedHeight,
      }),
    [fixedHeight],
  );

  const cornerCloseButton = React.useMemo(() => {
    if (!withCloseButton) {
      return null;
    }
    return (
      <span className={css['modal-close']} onClick={onClose}>
        <SWMansionIcon size={24} icon="cross" />
      </span>
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
      className={overlayClasses}
      ref={overlayRef}
      onClick={onBackgroundClick}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className={modalContainerClasses}>
        <div className={modalClasses}>
          <div className={css['modal-header']}>
            {cornerCloseButton}
            <h2>
              {headerIcon}
              {name}
            </h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
