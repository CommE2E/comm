// @flow

import {
  type ActivityUpdateResponseServerSocketMessage,
  clientSocketMessageTypes,
  serverSocketMessageTypes,
  queueActivityUpdatesActionType,
  activityUpdateSuccessActionType,
  activityUpdateFailedActionType,
  type ClientSocketMessageWithoutID,
  type ConnectionInfo,
  connectionInfoPropType,
} from '../types/socket-types';
import type { ActivityUpdate } from '../types/activity-types';
import type { DispatchActionPayload } from '../utils/action-utils';
import type { BaseAppState } from '../types/redux-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { connect } from '../utils/redux-utils';
import { InflightRequests, SocketTimeout } from './inflight-requests';
import { ServerError } from '../utils/errors';

type Props = {|
  activeThread: ?string,
  inflightRequests: ?InflightRequests,
  sendMessage: (message: ClientSocketMessageWithoutID) => number,
  // Redux state
  connection: ConnectionInfo,
  activeThreadLatestMessage: ?string,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class ActivityHandler extends React.PureComponent<Props> {

  static propTypes = {
    activeThread: PropTypes.string,
    inflightRequests: PropTypes.object,
    sendMessage: PropTypes.func.isRequired,
    connection: connectionInfoPropType.isRequired,
    activeThreadLatestMessage: PropTypes.string,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

  componentDidUpdate(prevProps: Props) {
    const activityUpdates = [];
    if (this.props.activeThread !== prevProps.activeThread) {
      if (prevProps.activeThread) {
        activityUpdates.push({
          focus: false,
          threadID: prevProps.activeThread,
          latestMessage: prevProps.activeThreadLatestMessage,
        });
      }
      if (this.props.activeThread) {
        activityUpdates.push({
          focus: true,
          threadID: this.props.activeThread,
        });
      }
    }

    if (activityUpdates.length > 0) {
      this.props.dispatchActionPayload(
        queueActivityUpdatesActionType,
        { activityUpdates },
      );
    }

    const { inflightRequests, connection } = this.props;
    if (!inflightRequests || connection.status !== "connected") {
      return;
    }

    if (prevProps.connection.status !== "connected") {
      const { queuedActivityUpdates } = this.props.connection;
      this.sendAndHandleActivityUpdates(
        [ ...queuedActivityUpdates, ...activityUpdates ],
      );
    } else {
      this.sendAndHandleActivityUpdates(activityUpdates);
    }
  }

  render() {
    return null;
  }

  sendAndHandleActivityUpdates(
    activityUpdates: $ReadOnlyArray<ActivityUpdate>,
  ) {
    if (activityUpdates.length === 0) {
      return;
    }
    const promise = this.sendActivityUpdates(activityUpdates);
    this.handleActivityUpdates(promise, activityUpdates);
  }

  sendActivityUpdates(
    activityUpdates: $ReadOnlyArray<ActivityUpdate>
  ): Promise<ActivityUpdateResponseServerSocketMessage> {
    const { inflightRequests } = this.props;
    invariant(inflightRequests, "inflightRequests should exist");
    const messageID = this.props.sendMessage({
      type: clientSocketMessageTypes.ACTIVITY_UPDATES,
      payload: { activityUpdates },
    });
    return inflightRequests.fetchResponse(
      messageID,
      serverSocketMessageTypes.ACTIVITY_UPDATE_RESPONSE,
    );
  }

  async handleActivityUpdates(
    promise: Promise<ActivityUpdateResponseServerSocketMessage>,
    activityUpdates: $ReadOnlyArray<ActivityUpdate>,
    retriesLeft: number = 1,
  ): Promise<void> {
    try {
      const response = await promise;
      this.props.dispatchActionPayload(
        activityUpdateSuccessActionType,
        { activityUpdates, result: response.payload },
      );
    } catch (e) {
      console.log(e);
      if (
        e instanceof SocketTimeout ||
        this.props.connection.status !== "connected" ||
        !this.props.inflightRequests
      ) {
        // This indicates that the socket will be closed. Do nothing, since when
        // it will reopen it will send all the queued activity updates again.
      } else if (
        retriesLeft === 0 ||
        (e instanceof ServerError && e.message !== "unknown_error")
      ) {
        // We're giving up on these activity updates, as they seem to cause the
        // server to error...
        this.props.dispatchActionPayload(
          activityUpdateFailedActionType,
          { activityUpdates },
        );
      } else {
        const newPromise = this.sendActivityUpdates(activityUpdates);
        await this.handleActivityUpdates(
          newPromise,
          activityUpdates,
          retriesLeft - 1,
        );
      }
    }
  }

}

export default connect(
  (state: BaseAppState<*>, ownProps: { activeThread: ?string }) => {
    const { activeThread } = ownProps;
    return {
      connection: state.connection,
      activeThreadLatestMessage:
        activeThread && state.messageStore.threads[activeThread]
          ? state.messageStore.threads[activeThread].messageIDs[0]
          : null,
    };
  },
  null,
  true,
)(ActivityHandler);
