// @flow

import * as React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';
import PropTypes from 'prop-types';

import css from '../style.css';

export type ModalSize = "small" | "large";
type Props = {
  name: string,
  onClose: () => void,
  children?: React.Node,
  size?: ModalSize,
};

class Modal extends React.PureComponent<Props> {

  static defaultProps = { size: "small" };
  overlay: ?HTMLDivElement;

  componentDidMount() {
    invariant(this.overlay, "overlay ref unset");
    this.overlay.focus();
  }

  render() {
    const overlayClasses = classNames(
      css['modal-overlay'],
      { [css['small-modal-overlay']]: this.props.size === "small" },
      { [css['large-modal-overlay']]: this.props.size === "large" },
    );
    const modalContainerClasses = classNames(
      css['modal-container'],
      { [css['large-modal-container']]: this.props.size === "large" },
    );
    return (
      <div
        className={overlayClasses}
        ref={this.overlayRef}
        onClick={this.onBackgroundClick}
        tabIndex={0}
        onKeyDown={this.onKeyDown}
      >
        <div className={modalContainerClasses}>
          <div className={css['modal']}>
            <div className={css['modal-header']}>
              <span
                className={css['modal-close']}
                onClick={this.props.onClose}
              >×</span>
              <h2>{this.props.name}</h2>
            </div>
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }

  overlayRef = (overlay: ?HTMLDivElement) => {
    this.overlay = overlay;
  }

  onBackgroundClick = (event: SyntheticEvent<HTMLDivElement>) => {
    if (event.target === this.overlay) {
      this.props.onClose();
    }
  }

  onKeyDown = (event: SyntheticKeyboardEvent<HTMLDivElement>) => {
    if (event.keyCode === 27) {
      this.props.onClose();
    }
  }

}

Modal.propTypes = {
  name: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  size: PropTypes.oneOf(["small", "large"]),
}

export default Modal;
