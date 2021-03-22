// @flow

import * as React from 'react';

import { sendReportsActionTypes, sendReports } from '../actions/report-actions';
import { queuedReports as queuedReportsSelector } from '../selectors/socket-selectors';
import {
  type ClientReportCreationRequest,
  type ClearDeliveredReportsPayload,
} from '../types/report-types';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from '../utils/action-utils';
import { useSelector } from '../utils/redux-utils';

type BaseProps = {|
  +canSendReports: boolean,
|};
type Props = {|
  ...BaseProps,
  +queuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
  +dispatchActionPromise: DispatchActionPromise,
  +sendReports: (
    reports: $ReadOnlyArray<ClientReportCreationRequest>,
  ) => Promise<void>,
|};
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

export default React.memo<BaseProps>(function ConnectedReportHandler(
  props: BaseProps,
) {
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
