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
  +name?: string,
  +subtitle?: string,
  +icon?: Icon,
  +onClose: () => void,
  +withCloseButton?: boolean,
  +size?: ModalSize,
  +modalHeaderCentered?: boolean,
  +secondaryHeaderButton?: React.Node,
  +primaryButton?: React.Node,
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
    subtitle,
    icon,
    withCloseButton = true,
    modalHeaderCentered = false,
    secondaryHeaderButton,
    primaryButton,
  } = props;

  const modalContainerClasses = classNames(css.modalContainer, {
    [css.modalContainerLarge]: size === 'large',
    [css.modalContainerSmall]: size === 'small',
  });

  const modalHeader = classNames({
    [css.modalHeader]: true,
    [css.modalHeaderCentered]: modalHeaderCentered,
  });

  const headerButtons = React.useMemo(() => {
    if (!withCloseButton && !secondaryHeaderButton) {
      return null;
    }

    let closeButton;
    if (withCloseButton) {
      closeButton = (
        <Button className={css.modalButton} onClick={onClose}>
          <SWMansionIcon size={24} icon="cross" />
        </Button>
      );
    }

    return (
      <div className={css.modalHeaderButtonsContainer}>
        <div className={css.modalButton}>{secondaryHeaderButton}</div>
        {closeButton}
      </div>
    );
  }, [onClose, secondaryHeaderButton, withCloseButton]);

  const headerIcon = React.useMemo(() => {
    if (!icon) {
      return null;
    }
    return <SWMansionIcon size={24} icon={icon} />;
  }, [icon]);

  const subtitleNode = React.useMemo(() => {
    if (!subtitle) {
      return null;
    }
    return <h2 className={css.subtitle}>{subtitle}</h2>;
  }, [subtitle]);

  const buttonContainer = React.useMemo(() => {
    if (!primaryButton) {
      return null;
    }

    const className = classNames(
      css.buttonContainer,
      css.primaryButtonContainer,
    );

    return <div className={className}>{primaryButton}</div>;
  }, [primaryButton]);

  const modal = React.useMemo(
    () => (
      <ModalOverlay onClose={onClose}>
        <div className={modalContainerClasses}>
          <div className={modalHeader}>
            <div className={css.modalHeaderTitle}>
              <h2 className={css.title}>
                {headerIcon}
                {name}
              </h2>
              {headerButtons}
            </div>
            {subtitleNode}
          </div>
          <div className={css.modalContentContainer}>{children}</div>
          {buttonContainer}
        </div>
      </ModalOverlay>
    ),
    [
      buttonContainer,
      children,
      headerButtons,
      headerIcon,
      modalContainerClasses,
      modalHeader,
      name,
      onClose,
      subtitleNode,
    ],
  );

  return modal;
}

export default Modal;
