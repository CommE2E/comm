// @flow

import React from 'react';

type Props = {
};
type State = {
  currentModal: ?React.Element<any>,
};

class ModalManager extends React.Component {

  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      currentModal: null,
    };
  }

  render() {
    return this.state.currentModal;
  }

  setModal(newModal: React.Element<any>) {
    this.setState({ currentModal: newModal });
  }

  clearModal() {
    this.setState({ currentModal: null });
  }

}

ModalManager.propTypes = {
}

export default ModalManager;
