// @flow

function getMessageForException(
  error: Error & { sqlMessage?: string, ... },
): string {
  return error.sqlMessage !== null && error.sqlMessage !== undefined
    ? 'database error'
    : error.message;
}

export { getMessageForException };
