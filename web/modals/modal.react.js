// @flow

import classNames from 'classnames';
import * as React from 'react';

import ModalOverlay from 'lib/components/modal-overlay.react.js';
import SWMansionIcon, {
  type Icon,
} from 'lib/components/SWMansionIcon.react.js';

import css from './modal.css';
import Button from '../components/button.react.js';

export type ModalSize = 'small' | 'large' | 'fit-content';

export type ModalOverridableProps = {
  +name: string,
  +icon?: Icon,
  +onClose: () => void,
  +withCloseButton?: boolean,
  +transparent?: boolean,
  +size?: ModalSize,
  +modalHeaderCentered?: boolean,
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
    transparent = false,
    withCloseButton = true,
    modalHeaderCentered = false,
  } = props;

  const modalContainerClasses = classNames({
    [css.modalContainer]: transparent === false,
    [css.modalContainerTransparent]: transparent === true,
    [css.modalContainerLarge]: size === 'large',
    [css.modalContainerSmall]: size === 'small',
  });

  const modalHeader = classNames({
    [css.modalHeader]: true,
    [css.modalHeaderCentered]: modalHeaderCentered,
  });

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
    <ModalOverlay onClose={onClose}>
      <div className={modalContainerClasses}>
        <div className={modalHeader}>
          <h2 className={css.title}>
            {headerIcon}
            {name}
          </h2>
          {cornerCloseButton}
        </div>
        {children}
      </div>
    </ModalOverlay>
  );
}

export default Modal;
