// @flow

import {
  sendReportActionTypes,
  sendReportsActionTypes,
  queueReportsActionType,
} from '../actions/report-actions';
import type { BaseAction } from '../types/redux-types';
import type { ClientReportCreationRequest } from '../types/report-types';

export default function reduceQueuedReports(
  state: $ReadOnlyArray<ClientReportCreationRequest>,
  action: BaseAction,
): $ReadOnlyArray<ClientReportCreationRequest> {
  if (
    (action.type === sendReportActionTypes.success ||
      action.type === sendReportsActionTypes.success) &&
    action.payload
  ) {
    const { payload } = action;
    const updatedReports = state.filter(
      (response) => !payload.reports.includes(response),
    );
    if (updatedReports.length === state.length) {
      return state;
    }
    return updatedReports;
  } else if (action.type === queueReportsActionType) {
    const { reports } = action.payload;
    return [...state, ...reports];
  }
  return state;
}
