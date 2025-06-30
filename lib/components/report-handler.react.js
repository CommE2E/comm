// @flow

import * as React from 'react';

import {
  sendReportsActionTypes,
  useSendReports,
} from '../actions/report-actions.js';
import { queuedReports as queuedReportsSelector } from '../selectors/socket-selectors.js';
import {
  type ClientReportCreationRequest,
  type ClearDeliveredReportsPayload,
  type ReportsServiceSendReportsAction,
} from '../types/report-types.js';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
} from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

type BaseProps = {
  +canSendReports: boolean,
};
type Props = {
  ...BaseProps,
  +queuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
  +dispatchActionPromise: DispatchActionPromise,
  +sendReports: ReportsServiceSendReportsAction,
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

  render(): React.Node {
    return null;
  }

  dispatchSendReports(reports: $ReadOnlyArray<ClientReportCreationRequest>) {
    if (reports.length === 0) {
      return;
    }
    void this.props.dispatchActionPromise(
      sendReportsActionTypes,
      this.sendReports(reports),
    );
  }

  async sendReports(
    reports: $ReadOnlyArray<ClientReportCreationRequest>,
  ): Promise<ClearDeliveredReportsPayload> {
    await this.props.sendReports(reports);
    return { reports };
  }
}

const ConnectedReportHandler: React.ComponentType<BaseProps> = React.memo<
  BaseProps,
  void,
>(function ConnectedReportHandler(props) {
  const queuedReports = useSelector(queuedReportsSelector);
  const dispatchActionPromise = useDispatchActionPromise();
  const callSendReports = useSendReports();

  return (
    <ReportHandler
      {...props}
      queuedReports={queuedReports}
      dispatchActionPromise={dispatchActionPromise}
      sendReports={callSendReports}
    />
  );
});

export default ConnectedReportHandler;
