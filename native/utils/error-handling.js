// @flow

const TASK_CANCELLED_FLAG = 'TASK_CANCELLED';

function checkIfTaskWasCancelled(error: Error): boolean {
  return error.message?.includes(TASK_CANCELLED_FLAG);
}

export { checkIfTaskWasCancelled };
