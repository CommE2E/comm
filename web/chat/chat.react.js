// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

import ChatThreadList from './chat-thread-list.react';
import ChatMessageList from './chat-message-list.react';
import InputStateContainer from '../input/input-state-container.react';

type Props = {|
  setModal: (modal: ?React.Node) => void,
|};
class Chat extends React.PureComponent<Props> {
  static propTypes = {
    setModal: PropTypes.func.isRequired,
  };

  render() {
    return (
      <>
        <ChatThreadList />
        <InputStateContainer setModal={this.props.setModal}>
          <ChatMessageList setModal={this.props.setModal} />
        </InputStateContainer>
      </>
    );
  }
}

export default Chat;
