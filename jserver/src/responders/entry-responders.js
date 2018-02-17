// @flow

import type { $Response, $Request } from 'express';
import type { CalendarQuery } from 'lib/types/entry-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';
import { threadPermissions } from 'lib/types/thread-types';

import { tShape, tRegex } from '../utils/tcomb-utils';
import { verifyThreadID } from '../fetchers/thread-fetchers';
import {
  fetchEntryInfos,
  checkThreadPermissionForEntry,
  fetchEntryRevisionInfo,
} from '../fetchers/entry-fetchers';

const dateType = tRegex(/^[0-9]{4}-[0-1][0-9]-[0-3][0-9]$/);

const entryQueryInputValidator = tShape({
  navID: t.String,
  startDate: dateType,
  endDate: dateType,
  includeDeleted: t.maybe(t.Boolean),
});

async function entryFetchResponder(req: $Request, res: $Response) {
  const entryQuery: CalendarQuery = (req.body: any);
  if (!entryQueryInputValidator.is(entryQuery)) {
    throw new ServerError('invalid_parameters');
  }

  let validNav = entryQuery.navID === "home";
  if (!validNav) {
    validNav = await verifyThreadID(entryQuery.navID);
  }
  if (!validNav) {
    throw new ServerError('invalid_parameters');
  }

  const { rawEntryInfos, userInfos } = await fetchEntryInfos(entryQuery);
  return { rawEntryInfos, userInfos };
}

type EntryRevisionHistoryFetch = {|
  id: string,
|};
const entryRevisionHistoryFetchInputValidator = tShape({
  id: t.String,
});

async function entryRevisionFetchResponder(req: $Request, res: $Response) {
  const entryRevisionHistoryFetch: EntryRevisionHistoryFetch = (req.body: any);
  if (!entryRevisionHistoryFetchInputValidator.is(entryRevisionHistoryFetch)) {
    throw new ServerError('invalid_parameters');
  }

  const hasPermission = await checkThreadPermissionForEntry(
    entryRevisionHistoryFetch.id,
    threadPermissions.VISIBLE,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const entryHistory = await fetchEntryRevisionInfo(
    entryRevisionHistoryFetch.id,
  );
  return { result: entryHistory };
}

export {
  entryFetchResponder,
  entryRevisionFetchResponder,
};
