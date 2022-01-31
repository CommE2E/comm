// @flow

function getMessageForException(error: Error): string {
  return 'sqlMessage' in error ? 'database error' : error.message;
}

export { getMessageForException };
