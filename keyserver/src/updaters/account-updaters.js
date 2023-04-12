// @flow

import invariant from 'invariant';
import bcrypt from 'twin-bcrypt';

import type {
  ResetPasswordRequest,
  UpdatePasswordRequest,
  UpdateUserSettingsRequest,
  LogInResponse,
} from 'lib/types/account-types.js';
import type {
  ClientAvatar,
  UpdateUserAvatarRequest,
} from 'lib/types/avatar-types.js';
import { updateTypes } from 'lib/types/update-types.js';
import type { PasswordUpdate } from 'lib/types/user-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { getUploadURL } from '../fetchers/upload-fetchers.js';
import type { Viewer } from '../session/viewer.js';

async function accountUpdater(
  viewer: Viewer,
  update: PasswordUpdate,
): Promise<void> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const newPassword = update.updatedFields.password;
  if (!newPassword) {
    // If it's an old client it may have given us an email,
    // but we don't store those anymore
    return;
  }

  const verifyQuery = SQL`
    SELECT username, hash FROM users WHERE id = ${viewer.userID}
  `;
  const [verifyResult] = await dbQuery(verifyQuery);
  if (verifyResult.length === 0) {
    throw new ServerError('internal_error');
  }
  const verifyRow = verifyResult[0];
  if (!bcrypt.compareSync(update.currentPassword, verifyRow.hash)) {
    throw new ServerError('invalid_credentials');
  }

  const changedFields = { hash: bcrypt.hashSync(newPassword) };
  const saveQuery = SQL`
    UPDATE users SET ${changedFields} WHERE id = ${viewer.userID}
  `;
  await dbQuery(saveQuery);

  const updateDatas = [
    {
      type: updateTypes.UPDATE_CURRENT_USER,
      userID: viewer.userID,
      time: Date.now(),
    },
  ];
  await createUpdates(updateDatas, {
    viewer,
    updatesForCurrentSession: 'broadcast',
  });
}

// eslint-disable-next-line no-unused-vars
async function checkAndSendVerificationEmail(viewer: Viewer): Promise<void> {
  // We don't want to crash old clients that call this,
  // but we have nothing we can do because we no longer store email addresses
}

async function checkAndSendPasswordResetEmail(
  // eslint-disable-next-line no-unused-vars
  request: ResetPasswordRequest,
): Promise<void> {
  // We don't want to crash old clients that call this,
  // but we have nothing we can do because we no longer store email addresses
}

/* eslint-disable no-unused-vars */
async function updatePassword(
  viewer: Viewer,
  request: UpdatePasswordRequest,
): Promise<LogInResponse> {
  /* eslint-enable no-unused-vars */
  // We have no way to handle this request anymore
  throw new ServerError('deprecated');
}

async function updateUserSettings(
  viewer: Viewer,
  request: UpdateUserSettingsRequest,
) {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const createOrUpdateSettingsQuery = SQL`
    INSERT INTO settings (user, name, data)
    VALUES ${[[viewer.id, request.name, request.data]]}
    ON DUPLICATE KEY UPDATE data = VALUE(data)
  `;
  await dbQuery(createOrUpdateSettingsQuery);
}

async function updateUserAvatar(
  viewer: Viewer,
  request: UpdateUserAvatarRequest,
): Promise<?ClientAvatar> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const newAvatarValue =
    request.type === 'remove' ? null : JSON.stringify(request);

  const mediaID = request.type === 'image' ? request.uploadID : null;

  const query = SQL`
    START TRANSACTION;

    UPDATE uploads
    SET container = NULL
    WHERE uploader = ${viewer.userID}
      AND container = ${viewer.userID};

    UPDATE uploads
    SET container = ${viewer.userID}
    WHERE id = ${mediaID}
      AND uploader = ${viewer.userID}
      AND container IS NULL;
      
    UPDATE users
    SET avatar = ${newAvatarValue}
    WHERE id = ${viewer.userID} 
      AND (
        ${mediaID} IS NULL
        OR EXISTS (
          SELECT 1
          FROM uploads
          WHERE id = ${mediaID}
            AND uploader = ${viewer.userID}
            AND container = ${viewer.userID}
        )
      );

    COMMIT;

    SELECT id AS upload_id, secret AS upload_secret
    FROM uploads
      WHERE id = ${mediaID}
        AND uploader = ${viewer.userID}
        AND container = ${viewer.userID};
  `;

  const [resultSet] = await dbQuery(query, { multipleStatements: true });
  const selectResult = resultSet.pop();

  if (request.type === 'remove') {
    return null;
  } else if (request.type !== 'image') {
    return request;
  } else {
    const [{ upload_id, upload_secret }] = selectResult;
    const uploadID = upload_id.toString();
    invariant(
      uploadID === request.uploadID,
      'uploadID of upload should match uploadID of UpdateUserAvatarRequest',
    );

    return {
      type: 'image',
      uri: getUploadURL(uploadID, upload_secret),
    };
  }
}

export {
  accountUpdater,
  checkAndSendVerificationEmail,
  checkAndSendPasswordResetEmail,
  updateUserSettings,
  updatePassword,
  updateUserAvatar,
};
