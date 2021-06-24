// @flow

import * as React from 'react';
import { Switch } from 'react-native';
import { useDispatch } from 'react-redux';

import { updateReportsEnabledActionType } from 'lib/reducers/enabled-reports-reducer';
import { type SupportedReports } from 'lib/types/enabled-reports';
import { useIsReportEnabled } from 'lib/utils/report-utils';

type Props = {|
  +reportType: SupportedReports,
|};
function ToggleReport(props: Props): React.Node {
  const dispatch = useDispatch();
  const { reportType } = props;
  const isReportEnabled = useIsReportEnabled(reportType);

  const onReportToggled = React.useCallback(
    (value) => {
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
