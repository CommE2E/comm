// @flow

const TASK_CANCELLED_FLAG = 'TASK_CANCELLED';

function isTaskCancelledError(error: Error): boolean {
  return error.message?.includes(TASK_CANCELLED_FLAG);
}

export { isTaskCancelledError };
