// @flow

import t from 'tcomb';
import type { TInterface } from 'tcomb';

import { tShape } from '../../utils/validation-utils.js';
import {
  type ReportCreationResponse,
  type FetchErrorReportInfosResponse,
  reportInfoValidator,
} from '../report-types.js';
import { userInfoValidator } from '../user-types.js';

export const reportCreationResponseValidator: TInterface<ReportCreationResponse> =
  tShape<ReportCreationResponse>({ id: t.String });

export const fetchErrorReportInfosResponseValidator: TInterface<FetchErrorReportInfosResponse> =
  tShape<FetchErrorReportInfosResponse>({
    reports: t.list(reportInfoValidator),
    userInfos: t.list(userInfoValidator),
  });
