// @flow

import {
  type ClientReportCreationRequest,
  type ClearDeliveredReportsPayload,
  queuedClientReportCreationRequestPropType,
} from '../types/report-types';
import type { DispatchActionPromise } from '../utils/action-utils';
import type { AppState } from '../types/redux-types';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from '../utils/redux-utils';
import { sendReportsActionTypes, sendReports } from '../actions/report-actions';
import { queuedReports } from '../selectors/socket-selectors';

type Props = {|
  canSendReports: boolean,
  // Redux state
  queuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  sendReports: (
    reports: $ReadOnlyArray<ClientReportCreationRequest>,
  ) => Promise<void>,
|};
class ReportHandler extends React.PureComponent<Props> {
  static propTypes = {
    canSendReports: PropTypes.bool.isRequired,
    queuedReports: PropTypes.arrayOf(queuedClientReportCreationRequestPropType)
      .isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendReports: PropTypes.func.isRequired,
  };

  componentDidMount() {
    if (this.props.canSendReports) {
      this.dispatchSendReports(this.props.queuedReports);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.props.canSendReports) {
      return;
    }

    const couldSend = prevProps.canSendReports;
    const curReports = this.props.queuedReports;
    if (!couldSend) {
      this.dispatchSendReports(curReports);
      return;
    }

    const prevReports = prevProps.queuedReports;
    if (curReports !== prevReports) {
      const prevResponses = new Set(prevReports);
      const newResponses = curReports.filter(
        (response) => !prevResponses.has(response),
      );
      this.dispatchSendReports(newResponses);
    }
  }

  render() {
    return null;
  }

  dispatchSendReports(reports: $ReadOnlyArray<ClientReportCreationRequest>) {
    if (reports.length === 0) {
      return;
    }
    this.props.dispatchActionPromise(
      sendReportsActionTypes,
      this.sendReports(reports),
    );
  }

  async sendReports(reports: $ReadOnlyArray<ClientReportCreationRequest>) {
    await this.props.sendReports(reports);
    return ({ reports }: ClearDeliveredReportsPayload);
  }
}

export default connect(
  (state: AppState) => ({
    queuedReports: queuedReports(state),
  }),
  { sendReports },
)(ReportHandler);
