// @flow

import type { AppState } from '../../redux-setup';

import React from 'react';

import css from '../../style.css';
import Modal from '../modal.react';
import LogInModal from './log-in-modal.react';
import RegisterModal from './register-modal.react';

type Props = {
  inOrderTo: string,
  onClose: () => void,
  setModal: (modal: React.Element<any>) => void,
};

class LogInFirstModal extends React.Component {

  props: Props;

  render() {
    return (
      <Modal name="Log in or register" onClose={this.props.onClose}>
        <div className={css['modal-body']}>
          <p>
            {`In order to ${this.props.inOrderTo}, you'll first need to `}
            <a
              href="#"
              className={css['show-login-modal']}
              onClick={this.onClickLogIn.bind(this)}
            >log in</a>
            {" or "}
            <a
              href="#"
              className={css['show-register-modal']}
              onClick={this.onClickRegister.bind(this)}
            >register</a>
            {" a new account."}
          </p>
        </div>
      </Modal>
    );
  }

  onClickLogIn(event: SyntheticEvent) {
    event.preventDefault();
    this.props.setModal(
      <LogInModal
        onClose={this.props.onClose}
        setModal={this.props.setModal}
      />
    );
  }

  onClickRegister(event: SyntheticEvent) {
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
  inOrderTo: React.PropTypes.string.isRequired,
  onClose: React.PropTypes.func.isRequired,
  setModal: React.PropTypes.func.isRequired,
};

export default LogInFirstModal;
