// @flow

import type { AppState } from '../../redux-setup';

import * as React from 'react';
import PropTypes from 'prop-types';

import css from '../../style.css';
import Modal from '../modal.react';
import LogInModal from './log-in-modal.react';
import RegisterModal from './register-modal.react';

type Props = {
  inOrderTo: string,
  onClose: () => void,
  setModal: (modal: React.Node) => void,
};

class LogInFirstModal extends React.PureComponent<Props> {

  render() {
    return (
      <Modal name="Log in or register" onClose={this.props.onClose}>
        <div className={css['modal-body']}>
          <p>
            {`In order to ${this.props.inOrderTo}, you'll first need to `}
            <a
              href="#"
              className={css['show-login-modal']}
              onClick={this.onClickLogIn}
            >log in</a>
            {" or "}
            <a
              href="#"
              className={css['show-register-modal']}
              onClick={this.onClickRegister}
            >register</a>
            {" a new account."}
          </p>
        </div>
      </Modal>
    );
  }

  onClickLogIn = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.setModal(
      <LogInModal
        onClose={this.props.onClose}
        setModal={this.props.setModal}
      />
    );
  }

  onClickRegister = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.setModal(
      <RegisterModal
        onClose={this.props.onClose}
        setModal={this.props.setModal}
      />
    );
  }

}

LogInFirstModal.propTypes = {
  inOrderTo: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  setModal: PropTypes.func.isRequired,
};

export default LogInFirstModal;
