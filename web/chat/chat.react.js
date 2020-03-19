// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

import ChatThreadList from './chat-thread-list.react';
import ChatInputStateContainer from './chat-input-state-container.react';

type Props = {|
  setModal: (modal: ?React.Node) => void,
|};
class Chat extends React.PureComponent<Props> {
  static propTypes = {
    setModal: PropTypes.func.isRequired,
  };

  render() {
    return (
      <React.Fragment>
        <ChatThreadList />
        <ChatInputStateContainer setModal={this.props.setModal} />
      </React.Fragment>
    );
  }
}

export default Chat;
