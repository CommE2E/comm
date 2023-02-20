// @flow

import * as React from 'react';

import {
  sendReportsActionTypes,
  sendReports,
} from '../actions/report-actions.js';
import { queuedReports as queuedReportsSelector } from '../selectors/socket-selectors.js';
import {
  type ClientReportCreationRequest,
  type ClearDeliveredReportsPayload,
} from '../types/report-types.js';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from '../utils/action-utils.js';
import { useSelector } from '../utils/redux-utils.js';

type BaseProps = {
  +canSendReports: boolean,
};
type Props = {
  ...BaseProps,
  +queuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
  +dispatchActionPromise: DispatchActionPromise,
  +sendReports: (
    reports: $ReadOnlyArray<ClientReportCreationRequest>,
  ) => Promise<void>,
};
class ReportHandler extends React.PureComponent<Props> {
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
        response => !prevResponses.has(response),
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

const ConnectedReportHandler: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedReportHandler(props) {
    const queuedReports = useSelector(queuedReportsSelector);
    const callSendReports = useServerCall(sendReports);
    const dispatchActionPromise = useDispatchActionPromise();

    return (
      <ReportHandler
        {...props}
        queuedReports={queuedReports}
        sendReports={callSendReports}
        dispatchActionPromise={dispatchActionPromise}
      />
    );
  });

export default ConnectedReportHandler;
