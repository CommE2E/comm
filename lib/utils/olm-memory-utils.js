// @flow

import olm from '@commapp/olm';

let olmTotalMemory = null,
  olmUsedMemory = null;

function verifyMemoryUsage(method: string) {
  try {
    if (olmTotalMemory === null && olmUsedMemory === null) {
      olmTotalMemory = olm.get_total_memory();
      olmUsedMemory = olm.get_used_memory();
      console.error(
        `Olm first time memory check - Total: ${olmTotalMemory ?? -1}, Used: ${
          olmUsedMemory ?? -1
        }`,
      );
      return;
    }

    const currentTotalMemory = olm.get_total_memory();
    if (currentTotalMemory !== olmTotalMemory) {
      console.error(
        `Olm's total memory changed from ${olmTotalMemory ?? -1} ` +
          `to ${currentTotalMemory} after executing ${method} method`,
      );
      olmTotalMemory = currentTotalMemory;
    }

    const currentUsedMemory = olm.get_used_memory();
    if (currentUsedMemory !== olmUsedMemory) {
      console.error(
        `Olm's used memory changed from ${olmUsedMemory ?? -1} ` +
          `to ${currentUsedMemory} after executing ${method} method`,
      );
      olmUsedMemory = currentUsedMemory;
    }
  } catch (e) {
    console.error('Encountered error while trying log Olm memory', e);
  }
}

type OlmMemory = {
  +total: ?number,
  +used: ?number,
};

function getOlmMemory(): OlmMemory {
  try {
    const total = olm.get_total_memory();
    const used = olm.get_used_memory();
    return { total, used };
  } catch (e) {
    console.error('Encountered error in getOlmMemory:', e);
    return { total: null, used: null };
  }
}

function compareAndLogOlmMemory(previous: OlmMemory, method: string) {
  const current = getOlmMemory();
  if (current.total !== previous.total) {
    console.error(
      `Olm's total memory changed from ${previous.total ?? -1} ` +
        `to ${current.total ?? -1} during execution of ${method} method`,
    );
  }
  if (current.used !== previous.used) {
    console.error(
      `Olm's used memory changed from ${previous.used ?? -1} ` +
        `to ${current.used ?? -1} during execution of ${method} method`,
    );
  }
}

export { verifyMemoryUsage, getOlmMemory, compareAndLogOlmMemory };
