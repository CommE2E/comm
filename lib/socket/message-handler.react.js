// @flow

import {
  type ServerSocketMessage,
  serverSocketMessageTypes,
  type SocketListener,
} from '../types/socket-types';
import { processMessagesActionType } from '../actions/message-actions';
import type { DispatchActionPayload } from '../utils/action-utils';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from '../utils/redux-utils';

type Props = {|
  addListener: (listener: SocketListener) => void,
  removeListener: (listener: SocketListener) => void,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class MessageHandler extends React.PureComponent<Props> {

  static propTypes = {
    addListener: PropTypes.func.isRequired,
    removeListener: PropTypes.func.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.props.addListener(this.onMessage);
  }

  componentWillUnmount() {
    this.props.removeListener(this.onMessage);
  }

  render() {
    return null;
  }

  onMessage = (message: ServerSocketMessage) => {
    if (message.type !== serverSocketMessageTypes.MESSAGES) {
      return;
    }
    this.props.dispatchActionPayload(
      processMessagesActionType,
      message.payload,
    );
  }

}

export default connect(
  null,
  null,
  true,
)(MessageHandler);
