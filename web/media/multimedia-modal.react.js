// @flow

import invariant from 'invariant';
import * as React from 'react';
import { XCircle as XCircleIcon } from 'react-feather';

import { ModalContext } from '../modals/modal-provider.react';
import css from './media.css';

type BaseProps = {
  +uri: string,
};

type Props = {
  ...BaseProps,
  +setModal: (modal: ?React.Node) => void,
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
          onClick={this.close}
          className={css.closeMultimediaModal}
        />
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
      this.close();
    }
  };

  onKeyDown: (
    event: SyntheticKeyboardEvent<HTMLDivElement>,
  ) => void = event => {
    if (event.keyCode === 27) {
      this.close();
    }
  };

  close: () => void = () => {
    this.props.setModal(null);
  };
}

function ConnectedMultiMediaModal(props: Props): React.Node {
  const { uri } = props;
  const modalContext = React.useContext(ModalContext);
  invariant(modalContext, 'modalContext should be set in MultimediaModal');

  return <MultimediaModal uri={uri} setModal={modalContext.setModal} />;
}

export default ConnectedMultiMediaModal;
