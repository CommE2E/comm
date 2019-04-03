// @flow

import {
  type ClientReportCreationRequest,
  type ReportCreationResponse,
  reportTypes,
} from '../types/report-types';
import {
  type ClientInconsistencyResponse,
  serverRequestTypes,
  clientResponsePropType,
} from '../types/request-types';
import type { DispatchActionPromise } from '../utils/action-utils';
import type { AppState } from '../types/redux-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { connect } from '../utils/redux-utils';
import { sendReportActionTypes, sendReport } from '../actions/report-actions';
import { queuedInconsistencyReports } from '../selectors/socket-selectors';
import { ServerError } from '../utils/errors';

type Props = {|
  hasWiFi: bool,
  // Redux state
  queuedInconsistencyReports: $ReadOnlyArray<ClientInconsistencyResponse>,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  sendReport: (
    request: ClientReportCreationRequest,
  ) => Promise<ReportCreationResponse>,
|};
class InconsistencyReportHandler extends React.PureComponent<Props> {

  static propTypes = {
    hasWiFi: PropTypes.bool.isRequired,
    queuedInconsistencyReports: PropTypes.arrayOf(
      clientResponsePropType,
    ).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendReport: PropTypes.func.isRequired,
  };

  componentDidMount() {
    const { queuedInconsistencyReports, hasWiFi } = this.props;
    if (queuedInconsistencyReports.length === 0 || !hasWiFi) {
      return;
    }

    this.sendResponses(queuedInconsistencyReports);
  }

  componentDidUpdate(prevProps: Props) {
    const { queuedInconsistencyReports, hasWiFi } = this.props;
    if (queuedInconsistencyReports.length === 0 || !hasWiFi) {
      return;
    }

    const hadWiFi = prevProps.hasWiFi;
    if (!hadWiFi) {
      this.sendResponses(queuedInconsistencyReports);
      return;
    }

    const prevInconsistencyReports = prevProps.queuedInconsistencyReports;
    if (queuedInconsistencyReports !== prevInconsistencyReports) {
      const prevResponses = new Set(prevInconsistencyReports);
      const newResponses = queuedInconsistencyReports.filter(
        response => !prevResponses.has(response),
      );
      this.sendResponses(newResponses);
    }
  }

  render() {
    return null;
  }

  sendResponses(responses: $ReadOnlyArray<ClientInconsistencyResponse>) {
    for (let response of responses) {
      this.props.dispatchActionPromise(
        sendReportActionTypes,
        this.sendResponse(response),
      );
    }
  }

  async sendResponse(response: ClientInconsistencyResponse) {
    if (response.type === serverRequestTypes.THREAD_INCONSISTENCY) {
      const { type, ...rest } = response;
      const report = { ...rest, type: reportTypes.THREAD_INCONSISTENCY };
      await this.sendReport(report);
    } else if (response.type === serverRequestTypes.ENTRY_INCONSISTENCY) {
      const { type, ...rest } = response;
      const report = { ...rest, type: reportTypes.ENTRY_INCONSISTENCY };
      await this.sendReport(report);
    }
    return { reports: [ response ] };
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
    queuedInconsistencyReports: queuedInconsistencyReports(state),
  }),
  { sendReport },
)(InconsistencyReportHandler);
