// @flow

import { isStaff } from 'lib/shared/user-utils';
import {
  type FetchErrorReportInfosResponse,
  type FetchErrorReportInfosRequest,
  type ReduxToolsImport,
  reportTypes,
} from 'lib/types/report-types';
import { ServerError } from 'lib/utils/errors';
import { values } from 'lib/utils/objects';

import { dbQuery, SQL } from '../database/database';
import type { Viewer } from '../session/viewer';

async function fetchErrorReportInfos(
  viewer: Viewer,
  request: FetchErrorReportInfosRequest,
): Promise<FetchErrorReportInfosResponse> {
  if (!viewer.loggedIn || !isStaff(viewer.userID)) {
    throw new ServerError('invalid_credentials');
  }

  const query = SQL`
    SELECT r.id, r.user, r.platform, r.report, r.creation_time, u.username
    FROM reports r
    LEFT JOIN users u ON u.id = r.user
  `;
  if (request.cursor) {
    query.append(SQL`WHERE r.id < ${request.cursor} `);
  }
  query.append(SQL`ORDER BY r.id DESC`);
  const [result] = await dbQuery(query);

  const reports = [];
  const userInfos = {};
  for (const row of result) {
    const viewerID = row.user.toString();
    const report = JSON.parse(row.report);
    let { platformDetails } = report;
    if (!platformDetails) {
      platformDetails = {
        platform: row.platform,
        codeVersion: report.codeVersion,
        stateVersion: report.stateVersion,
      };
    }
    reports.push({
      id: row.id.toString(),
      viewerID,
      platformDetails,
      creationTime: row.creation_time,
    });
    if (row.username) {
      userInfos[viewerID] = {
        id: viewerID,
        username: row.username,
      };
    }
  }

  return { reports, userInfos: values(userInfos) };
}

async function fetchReduxToolsImport(
  viewer: Viewer,
  id: string,
): Promise<ReduxToolsImport> {
  if (!viewer.loggedIn || !isStaff(viewer.userID)) {
    throw new ServerError('invalid_credentials');
  }

  const query = SQL`
    SELECT user, report, creation_time
    FROM reports
    WHERE id = ${id} AND type = ${reportTypes.ERROR}
  `;
  const [result] = await dbQuery(query);
  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const row = result[0];

  const report = JSON.parse(row.report);
  const _persist = report.preloadedState._persist
    ? report.preloadedState._persist
    : {};
  const navState =
    report.currentState && report.currentState.navState
      ? report.currentState.navState
      : undefined;
  return {
    preloadedState: {
      ...report.preloadedState,
      _persist: {
        ..._persist,
        // Setting this to false disables redux-persist
        rehydrated: false,
      },
      navState,
      frozen: true,
    },
    payload: report.actions,
  };
}

export { fetchErrorReportInfos, fetchReduxToolsImport };
