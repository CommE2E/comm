// @flow

import React from 'react';
import invariant from 'invariant';
import classNames from 'classnames';

export type ModalSize = "large" | "small";
type Props = {
  name: string,
  onClose: () => void,
  children?: React.Element<any>,
  size?: ModalSize,
};

class Modal extends React.Component {

  static defaultProps: { size: ModalSize };
  props: Props;
  overlay: ?HTMLDivElement;

  componentDidMount() {
    invariant(this.overlay, "overlay ref unset");
    this.overlay.focus();
  }

  render() {
    const overlayClasses = classNames(
      "modal-overlay",
      { "large-modal-overlay": this.props.size === "large" },
    );
    const modalClasses = classNames(
      "modal",
      { "large-modal": this.props.size === "large" },
    );
    return (
      <div
        className={overlayClasses}
        ref={(overlay) => this.overlay = overlay}
        onClick={this.onBackgroundClick.bind(this)}
        tabIndex={0}
        onKeyDown={this.onKeyDown.bind(this)}
      >
        <div className={modalClasses}>
          <div className="modal-header">
            <span className="modal-close" onClick={this.props.onClose}>×</span>
            <h2>{this.props.name}</h2>
          </div>
          {this.props.children}
        </div>
      </div>
    );
  }

  onBackgroundClick(event: SyntheticEvent) {
    if (event.target === this.overlay) {
      this.props.onClose();
    }
  }

  // Throw away typechecking here because SyntheticEvent isn't typed
  onKeyDown(event: any) {
    if (event.keyCode === 27) {
      this.props.onClose();
    }
  }

}

Modal.propTypes = {
  name: React.PropTypes.string.isRequired,
  onClose: React.PropTypes.func.isRequired,
  size: React.PropTypes.string,
}

Modal.defaultProps = {
  size: "small",
};

export default Modal;
