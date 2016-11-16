// @flow

import type { AppState } from '../../redux-reducer';

import React from 'react';

import Modal from '../modal.react';
import LogInModal from './log-in-modal.react';
import RegisterModal from './register-modal.react';

type Props = {
  onClose: () => void,
  setModal: (modal: React.Element<any>) => void,
};

class LogInToCreateSquadModal extends React.Component {

  props: Props;

  render() {
    return (
      <Modal name="Log in or register" onClose={this.props.onClose}>
        <div className="modal-body">
          <p>
            {"In order to create a new squad, you'll first need to "}
            <a
              href="#"
              className="show-login-modal"
              onClick={this.onClickLogIn.bind(this)}
            >log in</a>
            {" or "}
            <a
              href="#"
              className="show-register-modal"
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

LogInToCreateSquadModal.propTypes = {
  onClose: React.PropTypes.func.isRequired,
  setModal: React.PropTypes.func.isRequired,
};

export default LogInToCreateSquadModal;
