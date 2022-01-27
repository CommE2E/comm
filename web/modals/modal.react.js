// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import css from './modal.css';

export type ModalSize = 'small' | 'large';
type Props = {
  +name: string,
  +onClose: () => void,
  +children?: React.Node,
  +size?: ModalSize,
  +fixedHeight?: boolean,
};
class Modal extends React.PureComponent<Props> {
  static defaultProps: { +size: ModalSize, fixedHeight: boolean } = {
    size: 'small',
    fixedHeight: true,
  };
  overlay: ?HTMLDivElement;

  componentDidMount() {
    invariant(this.overlay, 'overlay ref unset');
    this.overlay.focus();
  }

  render(): React.Node {
    const { size, children, onClose, fixedHeight, name } = this.props;

    const overlayClasses = classNames(
      css['modal-overlay'],
      { [css['small-modal-overlay']]: size === 'small' },
      { [css['large-modal-overlay']]: size === 'large' },
      { [css['resizable-modal-overlay']]: !fixedHeight },
    );
    const modalContainerClasses = classNames(css['modal-container'], {
      [css['large-modal-container']]: size === 'large',
    });
    const modalClasses = classNames(css['modal'], {
      [css['fixed-height-modal']]: fixedHeight,
    });
    return (
      <div
        className={overlayClasses}
        ref={this.overlayRef}
        onClick={this.onBackgroundClick}
        tabIndex={0}
        onKeyDown={this.onKeyDown}
      >
        <div className={modalContainerClasses}>
          <div className={modalClasses}>
            <div className={css['modal-header']}>
              <span className={css['modal-close']} onClick={onClose}>
                ×
              </span>
              <h2>{name}</h2>
            </div>
            {children}
          </div>
        </div>
      </div>
    );
  }

  overlayRef: (overlay: ?HTMLDivElement) => void = overlay => {
    this.overlay = overlay;
  };

  onBackgroundClick: (
    event: SyntheticEvent<HTMLDivElement>,
  ) => void = event => {
    if (event.target === this.overlay) {
      this.props.onClose();
    }
  };

  onKeyDown: (
    event: SyntheticKeyboardEvent<HTMLDivElement>,
  ) => void = event => {
    if (event.keyCode === 27) {
      this.props.onClose();
    }
  };
}

export default Modal;
