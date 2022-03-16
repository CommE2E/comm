// @flow

import * as React from 'react';

import LogInModal from '../modals/account/log-in-modal.react';
import { useModalContext } from '../modals/modal-provider.react';
import css from './splash.css';

type Props = {
  +setModal: (modal: React.Node) => void,
  +modal: ?React.Node,
};
class Splash extends React.PureComponent<Props> {
  render() {
    return (
      <React.Fragment>
        <div onClick={this.onClickLogIn} className={css.loginContainer}>
          <h1>Log in</h1>
        </div>
        {this.props.modal}
      </React.Fragment>
    );
  }

  onClickLogIn = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.setModal(<LogInModal />);
  };
}

const ConnectedSplash: React.ComponentType<{}> = React.memo<{}>(
  function ConnectedSplash(): React.Node {
    const modalContext = useModalContext();

    return (
      <Splash setModal={modalContext.setModal} modal={modalContext.modal} />
    );
  },
);

export default ConnectedSplash;
