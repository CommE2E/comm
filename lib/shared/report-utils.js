// @flow

import invariant from 'invariant';

import {
  type ClientReportCreationRequest,
  reportTypes,
} from '../types/report-types.js';
import {
  type ClientInconsistencyResponse,
  serverRequestTypes,
} from '../types/request-types.js';

function inconsistencyResponsesToReports(
  responses: $ReadOnlyArray<ClientInconsistencyResponse>,
): ClientReportCreationRequest[] {
  return responses.map(response => {
    if (response.type === serverRequestTypes.THREAD_INCONSISTENCY) {
      const { type, ...rest } = response;
      return { ...rest, type: reportTypes.THREAD_INCONSISTENCY };
    } else if (response.type === serverRequestTypes.ENTRY_INCONSISTENCY) {
      const { type, ...rest } = response;
      return { ...rest, type: reportTypes.ENTRY_INCONSISTENCY };
    } else {
      invariant(false, `unexpected serverRequestType ${response.type}`);
    }
  });
}

export { inconsistencyResponsesToReports };
