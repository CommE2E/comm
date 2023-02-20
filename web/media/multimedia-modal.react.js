// @flow

import invariant from 'invariant';
import * as React from 'react';
import { XCircle as XCircleIcon } from 'react-feather';

import { useModalContext } from 'lib/components/modal-provider.react.js';

import css from './media.css';

type BaseProps = {
  +uri: string,
};

type Props = {
  ...BaseProps,
  +popModal: (modal: ?React.Node) => void,
};

class MultimediaModal extends React.PureComponent<Props> {
  overlay: ?HTMLDivElement;

  componentDidMount() {
    invariant(this.overlay, 'overlay ref unset');
    this.overlay.focus();
  }

  render(): React.Node {
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
          onClick={this.props.popModal}
          className={css.closeMultimediaModal}
        />
      </div>
    );
  }

  overlayRef: (overlay: ?HTMLDivElement) => void = overlay => {
    this.overlay = overlay;
  };

  onBackgroundClick: (event: SyntheticEvent<HTMLDivElement>) => void =
    event => {
      if (event.target === this.overlay) {
        this.props.popModal();
      }
    };

  onKeyDown: (event: SyntheticKeyboardEvent<HTMLDivElement>) => void =
    event => {
      if (event.key === 'Escape') {
        this.props.popModal();
      }
    };
}

function ConnectedMultiMediaModal(props: BaseProps): React.Node {
  const modalContext = useModalContext();

  return <MultimediaModal {...props} popModal={modalContext.popModal} />;
}

export default ConnectedMultiMediaModal;
