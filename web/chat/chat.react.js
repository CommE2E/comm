// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

import ChatMessageList from './chat-message-list.react';
import InputStateContainer from '../input/input-state-container.react';
import ChatTabs from './chat-tabs.react';

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
        <ChatTabs />
        <InputStateContainer setModal={this.props.setModal}>
          <ChatMessageList setModal={this.props.setModal} />
        </InputStateContainer>
      </>
    );
  }
}

export default Chat;
