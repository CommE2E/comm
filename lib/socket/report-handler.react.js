// @flow

import {
  type ClientReportCreationRequest,
  type ReportCreationResponse,
  reportTypes,
  queuedClientReportCreationRequestPropType,
} from '../types/report-types';
import type { DispatchActionPromise } from '../utils/action-utils';
import type { AppState } from '../types/redux-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { connect } from '../utils/redux-utils';
import { sendReportActionTypes, sendReport } from '../actions/report-actions';
import { queuedReports } from '../selectors/socket-selectors';
import { ServerError } from '../utils/errors';

type Props = {|
  hasWiFi: bool,
  frozen: bool,
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
    hasWiFi: PropTypes.bool.isRequired,
    frozen: PropTypes.bool.isRequired,
    queuedReports: PropTypes.arrayOf(
      queuedClientReportCreationRequestPropType,
    ).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendReport: PropTypes.func.isRequired,
  };

  static canSend(props: Props) {
    const { frozen, hasWiFi } = props;
    return !frozen && hasWiFi;
  }

  componentDidMount() {
    if (ReportHandler.canSend(this.props)) {
      this.sendResponses(this.props.queuedReports);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const canSend = ReportHandler.canSend(this.props);
    if (!canSend) {
      return;
    }

    const couldSend = ReportHandler.canSend(prevProps);
    const { queuedReports } = this.props;
    if (!couldSend) {
      this.sendResponses(queuedReports);
      return;
    }

    const prevReports = prevProps.queuedReports;
    if (queuedReports !== prevReports) {
      const prevResponses = new Set(prevReports);
      const newResponses = queuedReports.filter(
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
    return { reports: [ report ] };
  }

  async sendReport(report: ClientReportCreationRequest) {
    try {
      await this.props.sendReport(report);
    } catch (e) {
      if (e instanceof ServerError && e.message === 'ignored_report') {
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
