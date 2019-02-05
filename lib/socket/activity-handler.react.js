// @flow

import {
  type ConnectionInfo,
  connectionInfoPropType,
} from '../types/socket-types';
import {
  type ActivityUpdate,
  type ActivityUpdateSuccessPayload,
  queueActivityUpdatesActionType,
} from '../types/activity-types';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from '../utils/action-utils';
import type { BaseAppState } from '../types/redux-types';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from '../utils/redux-utils';
import {
  updateActivityActionTypes,
  updateActivity,
} from '../actions/activity-actions';

type Props = {|
  activeThread: ?string,
  // Redux state
  connection: ConnectionInfo,
  activeThreadLatestMessage: ?string,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  updateActivity: (
    activityUpdates: $ReadOnlyArray<ActivityUpdate>,
  ) => Promise<ActivityUpdateSuccessPayload>,
|};
class ActivityHandler extends React.PureComponent<Props> {

  static propTypes = {
    activeThread: PropTypes.string,
    connection: connectionInfoPropType.isRequired,
    activeThreadLatestMessage: PropTypes.string,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    updateActivity: PropTypes.func.isRequired,
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

    if (this.props.connection.status !== "connected") {
      return;
    }

    if (prevProps.connection.status !== "connected") {
      const { queuedActivityUpdates } = this.props.connection;
      this.sendActivityUpdates(
        [ ...queuedActivityUpdates, ...activityUpdates ],
      );
    } else {
      this.sendActivityUpdates(activityUpdates);
    }
  }

  render() {
    return null;
  }

  sendActivityUpdates(activityUpdates: $ReadOnlyArray<ActivityUpdate>) {
    if (activityUpdates.length === 0) {
      return;
    }
    this.props.dispatchActionPromise(
      updateActivityActionTypes,
      this.updateActivity(activityUpdates),
    );
  }

  async updateActivity(activityUpdates: $ReadOnlyArray<ActivityUpdate>) {
    try {
      return await this.props.updateActivity(activityUpdates);
    } catch (e) {
      e.activityUpdates = activityUpdates;
      throw e;
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
  { updateActivity },
)(ActivityHandler);
