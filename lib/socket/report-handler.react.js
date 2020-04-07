// @flow

import {
  type ClientReportCreationRequest,
  type ReportCreationResponse,
  type ClearDeliveredReportsPayload,
  queuedClientReportCreationRequestPropType,
} from '../types/report-types';
import type { DispatchActionPromise } from '../utils/action-utils';
import type { AppState } from '../types/redux-types';

import * as React from 'react';
import PropTypes from 'prop-types';

import { connect } from '../utils/redux-utils';
import { sendReportActionTypes, sendReport } from '../actions/report-actions';
import { queuedReports } from '../selectors/socket-selectors';
import { ServerError } from '../utils/errors';

type Props = {|
  canSendReports: boolean,
  // Redux state
  queuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  sendReport: (
    request: ClientReportCreationRequest,
  ) => Promise<ReportCreationResponse>,
|};
class ReportHandler extends React.PureComponent<Props> {
  static propTypes = {
    canSendReports: PropTypes.bool.isRequired,
    queuedReports: PropTypes.arrayOf(queuedClientReportCreationRequestPropType)
      .isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendReport: PropTypes.func.isRequired,
  };

  componentDidMount() {
    if (this.props.canSendReports) {
      this.sendResponses(this.props.queuedReports);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (!this.props.canSendReports) {
      return;
    }

    const couldSend = prevProps.canSendReports;
    const curReports = this.props.queuedReports;
    if (!couldSend) {
      this.sendResponses(curReports);
      return;
    }

    const prevReports = prevProps.queuedReports;
    if (curReports !== prevReports) {
      const prevResponses = new Set(prevReports);
      const newResponses = curReports.filter(
        response => !prevResponses.has(response),
      );
      this.sendResponses(newResponses);
    }
  }

  render() {
    return null;
  }

  sendResponses(responses: $ReadOnlyArray<ClientReportCreationRequest>) {
    for (let response of responses) {
      this.props.dispatchActionPromise(
        sendReportActionTypes,
        this.sendResponse(response),
      );
    }
  }

  async sendResponse(report: ClientReportCreationRequest) {
    await this.sendReport(report);
    return ({ reports: [report] }: ClearDeliveredReportsPayload);
  }

  async sendReport(report: ClientReportCreationRequest) {
    try {
      await this.props.sendReport(report);
    } catch (e) {
      if (e instanceof ServerError && e.message === 'ignored_report') {
        // nothing
      } else {
        throw e;
      }
    }
  }
}

export default connect(
  (state: AppState) => ({
    queuedReports: queuedReports(state),
  }),
  { sendReport },
)(ReportHandler);
