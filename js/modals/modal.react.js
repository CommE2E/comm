// @flow

import React from 'react';
import invariant from 'invariant';

type Props = {
  name: string,
  onClose: () => void,
  children?: React.Element<any>,
};

class Modal extends React.Component {

  props: Props;
  overlay: ?HTMLDivElement;

  componentDidMount() {
    invariant(this.overlay, "overlay ref unset");
    this.overlay.focus();
  }

  render() {
    return (
      <div
        className="react-modal-overlay"
        ref={(overlay) => this.overlay = overlay}
        onClick={this.onBackgroundClick.bind(this)}
        tabIndex={0}
        onKeyDown={this.onKeyDown.bind(this)}
      >
        <div className="modal large-modal">
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
}

export default Modal;
