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
        <div className={css.headerContainer}>
          <div className={css.top}>
            <header className={css.header}>
              <div className={css.headerContents}>
                <h1>Comm</h1>
                <div className={css.actionLinks}>
                  <a href="#" onClick={this.onClickLogIn}>
                    <span>Log in</span>
                  </a>
                </div>
              </div>
            </header>
          </div>
        </div>
        <div className={css.content}>
          <div className={css.topContainer}>
            <div className={css.top}>
              <div className={css.body}>
                <div className={css.intro}>
                  <p className={css.introHeader}>
                    Comm is a chat app with an integrated calendar.
                  </p>
                  <p className={css.introDescription}>
                    We make it incredibly easy to plan events with your friends.
                  </p>
                </div>
              </div>
            </div>
          </div>
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
