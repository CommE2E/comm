// @flow
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
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
  +subtitle?: string,
  +icon?: Icon,
  +onClose: () => void,
  +withCloseButton?: boolean,
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
    subtitle,
    icon,
    withCloseButton = true,
    modalHeaderCentered = false,
  } = props;

  const modalContainerClasses = classNames(css.modalContainer, {
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

  let subtitleNode;
  if (subtitle) {
    subtitleNode = <h2 className={css.subtitle}>{subtitle}</h2>;
  }
  return (
    <ModalOverlay onClose={onClose}>
      <FocusTrap>
        <div className={modalContainerClasses}>
          <div className={modalHeader}>
            <div className={css.modalHeaderTitle}>
              <h2 className={css.title}>
                {headerIcon}
                {name}
              </h2>
              {cornerCloseButton}
            </div>
            {subtitleNode}
          </div>
          {children}
        </div>
      </FocusTrap>
    </ModalOverlay>
  );
}

export default Modal;
