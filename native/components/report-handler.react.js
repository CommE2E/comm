// @flow

import * as React from 'react';

import BaseReportHandler from 'lib/components/report-handler.react.js';

import { InputStateContext } from '../input/input-state.js';
import { useSelector } from '../redux/redux-utils.js';

function ReportHandler(): React.Node {
  const inputState = React.useContext(InputStateContext);
  const canSendReports = useSelector(
    state =>
      !state.frozen &&
      state.connectivity.hasWiFi &&
      (!inputState || !inputState.uploadInProgress()),
  );
  return <BaseReportHandler canSendReports={canSendReports} />;
}

export default ReportHandler;
