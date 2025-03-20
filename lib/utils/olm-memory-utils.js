// @flow

import olm from '@commapp/olm';

let olmTotalMemory = null,
  olmUsedMemory = null;

function verifyMemoryUsage(method: string) {
  try {
    if (olmTotalMemory === null && olmUsedMemory === null) {
      olmTotalMemory = olm.get_total_memory();
      olmUsedMemory = olm.get_used_memory();
      return;
    }

    const currentTotalMemory = olm.get_total_memory();
    if (currentTotalMemory !== olmTotalMemory) {
      console.error(
        `Olm's total memory changed from ${olmTotalMemory ?? 0} ` +
          `to ${currentTotalMemory} after executing ${method} method`,
      );
      olmTotalMemory = currentTotalMemory;
    }

    const currentUsedMemory = olm.get_used_memory();
    if (currentUsedMemory !== olmUsedMemory) {
      console.error(
        `Olm's used memory changed from ${olmUsedMemory ?? 0} ` +
          `to ${currentUsedMemory} after executing ${method} method`,
      );
      olmUsedMemory = currentUsedMemory;
    }
  } catch (e) {
    console.error('Encountered error while trying log Olm memory', e);
  }
}

export { verifyMemoryUsage };
