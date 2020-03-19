// @flow

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import { XCircle as XCircleIcon } from 'react-feather';

import css from './chat-message-list.css';

type Props = {|
  uri: string,
  setModal: (modal: ?React.Node) => void,
|};
class MultimediaModal extends React.PureComponent<Props> {
  static propTypes = {
    uri: PropTypes.string.isRequired,
    setModal: PropTypes.func.isRequired,
  };
  overlay: ?HTMLDivElement;

  componentDidMount() {
    invariant(this.overlay, 'overlay ref unset');
    this.overlay.focus();
  }

  render() {
    return (
      <div
        className={css.multimediaModalOverlay}
        ref={this.overlayRef}
        onClick={this.onBackgroundClick}
        tabIndex={0}
        onKeyDown={this.onKeyDown}
      >
        <img src={this.props.uri} />
        <XCircleIcon
          onClick={this.close}
          className={css.closeMultimediaModal}
        />
      </div>
    );
  }

  overlayRef = (overlay: ?HTMLDivElement) => {
    this.overlay = overlay;
  };

  onBackgroundClick = (event: SyntheticEvent<HTMLDivElement>) => {
    if (event.target === this.overlay) {
      this.close();
    }
  };

  onKeyDown = (event: SyntheticKeyboardEvent<HTMLDivElement>) => {
    if (event.keyCode === 27) {
      this.close();
    }
  };

  close = () => {
    this.props.setModal(null);
  };
}

export default MultimediaModal;
