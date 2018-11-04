// @flow

import {
  type ServerSocketMessage,
  serverSocketMessageTypes,
  type SocketListener,
} from '../types/socket-types';
import { processUpdatesActionType } from '../types/update-types';
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
class UpdateHandler extends React.PureComponent<Props> {

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
    if (message.type !== serverSocketMessageTypes.UPDATES) {
      return;
    }
    this.props.dispatchActionPayload(
      processUpdatesActionType,
      message.payload,
    );
  }

}

export default connect(
  null,
  null,
  true,
)(UpdateHandler);
