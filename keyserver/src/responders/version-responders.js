// @flow

import type { $Response, $Request } from 'express';
import t from 'tcomb';

import { isStaff } from 'lib/shared/user-utils.js';
import type { CreateNewVersionsRequest } from 'lib/types/version-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { tShape, tDeviceType } from 'lib/utils/validation-utils.js';

import createIDs from '../creators/id-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import type { Viewer } from '../session/viewer.js';
import { validateInput } from '../utils/validation-utils.js';

const createNewVersionInputValidator = tShape({
  codeVersion: t.Number,
  deviceType: tDeviceType,
});

async function createNewVersionResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<void> {
  if (!viewer.loggedIn || !isStaff(viewer.userID)) {
    throw new ServerError('invalid_credentials');
  }

  const request: CreateNewVersionsRequest = ({
    codeVersion: parseInt(req.params.codeVersion),
    deviceType: req.params.deviceType,
  }: any);
  await validateInput(viewer, createNewVersionInputValidator, request);

  const [id] = await createIDs('versions', 1);
  const row = [id, request.codeVersion, request.deviceType, Date.now()];
  const insertQuery = SQL`
    INSERT INTO versions (id, code_version, platform, creation_time)
    VALUES ${[row]}
  `;
  try {
    await dbQuery(insertQuery);
    res.json({ success: true });
  } catch {
    await dbQuery(SQL`DELETE FROM ids WHERE id = ${id}`);
    res.json({ success: false });
  }
}

async function markVersionDeployedResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<void> {
  if (!viewer.loggedIn || !isStaff(viewer.userID)) {
    throw new ServerError('invalid_credentials');
  }

  const request: CreateNewVersionsRequest = ({
    codeVersion: parseInt(req.params.codeVersion),
    deviceType: req.params.deviceType,
  }: any);
  await validateInput(viewer, createNewVersionInputValidator, request);

  const updateQuery = SQL`
    UPDATE versions
    SET deploy_time = ${Date.now()}
    WHERE code_version = ${request.codeVersion}
      AND platform = ${request.deviceType}
  `;
  const [results] = await dbQuery(updateQuery);

  const success = !!(results.affectedRows && results.affectedRows > 0);
  res.json({ success });
}

export { createNewVersionResponder, markVersionDeployedResponder };
