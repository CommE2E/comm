// @flow

function getMessageForException(
  error: Error & { sqlMessage?: string, ... },
): string {
  return error.sqlMessage !== null && error.sqlMessage !== undefined
    ? 'database error'
    : error.message;
}

const userSettingsTypes = Object.freeze({
  default_notifications: 'default_user_notifications',
});

export { getMessageForException, userSettingsTypes };
