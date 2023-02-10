// @flow

import * as React from 'react';
import { Switch } from 'react-native';
import { useDispatch } from 'react-redux';

import { updateReportsEnabledActionType } from 'lib/reducers/report-store-reducer.js';
import { type SupportedReports } from 'lib/types/report-types.js';
import { useIsReportEnabled } from 'lib/utils/report-utils.js';

type Props = {
  +reportType: SupportedReports,
};
function ToggleReport(props: Props): React.Node {
  const dispatch = useDispatch();
  const { reportType } = props;
  const isReportEnabled = useIsReportEnabled(reportType);

  const onReportToggled = React.useCallback(
    value => {
      dispatch({
        type: updateReportsEnabledActionType,
        payload: { [(reportType: string)]: value },
      });
    },
    [dispatch, reportType],
  );

  return <Switch value={isReportEnabled} onValueChange={onReportToggled} />;
}

export default ToggleReport;
