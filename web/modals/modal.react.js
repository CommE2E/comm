// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import css from '../style.css';

export type ModalSize = 'small' | 'large';
type Props = {|
  +name: string,
  +onClose: () => void,
  +children?: React.Node,
  +size?: ModalSize,
  +fixedHeight?: boolean,
|};
class Modal extends React.PureComponent<Props> {
  static defaultProps: {| +size: ModalSize, fixedHeight: boolean |} = { size: 'small', fixedHeight: true };
  overlay: ?HTMLDivElement;

  componentDidMount() {
    invariant(this.overlay, 'overlay ref unset');
    this.overlay.focus();
  }

  render(): React.Node {
    const overlayClasses = classNames(
      css['modal-overlay'],
      { [css['small-modal-overlay']]: this.props.size === 'small' },
      { [css['large-modal-overlay']]: this.props.size === 'large' },
      { [css['resizable-modal-overlay']]: !this.props.fixedHeight },
    );
    const modalContainerClasses = classNames(css['modal-container'], {
      [css['large-modal-container']]: this.props.size === 'large',
    });
    const modalClasses = classNames(css['modal'], {
      [css['fixed-height-modal']]: this.props.fixedHeight,
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
              <span className={css['modal-close']} onClick={this.props.onClose}>
                ×
              </span>
              <h2>{this.props.name}</h2>
            </div>
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }

  overlayRef: (overlay: ?HTMLDivElement) => void = overlay => {
    this.overlay = overlay;
  };

  onBackgroundClick: (event: SyntheticEvent<HTMLDivElement>) => void = event => {
    if (event.target === this.overlay) {
      this.props.onClose();
    }
  };

  onKeyDown: (event: SyntheticKeyboardEvent<HTMLDivElement>) => void = event => {
    if (event.keyCode === 27) {
      this.props.onClose();
    }
  };
}

export default Modal;
