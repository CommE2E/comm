// @flow

import type { BaseAction } from '../types/redux-types';
import type { ClientReportCreationRequest } from '../types/report-types';

import {
  sendReportActionTypes,
  queueReportsActionType,
} from '../actions/report-actions';

export default function reduceQueuedReports(
  state: $ReadOnlyArray<ClientReportCreationRequest>,
  action: BaseAction,
): $ReadOnlyArray<ClientReportCreationRequest> {
  if (action.type === sendReportActionTypes.success && action.payload) {
    const { payload } = action;
    const updatedReports = state.filter(
      response => !payload.reports.includes(response),
    );
    if (updatedReports.length === state.length) {
      return state;
    }
    return updatedReports;
  } else if (action.type === queueReportsActionType) {
    const { reports } = action.payload;
    return [ ...state, ...reports ];
  }
  return state;
}
