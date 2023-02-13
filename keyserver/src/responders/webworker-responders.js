// @flow

import type { $Request, $Response } from 'express';
import path from 'path';

function webWorkerResponder(req: $Request, res: $Response): void {
  let workerPath;

  if (req.params.worker === 'notif') {
    workerPath = 'pushNotif.build.cjs';
  }

  if (!workerPath) {
    res.sendStatus(404);
    return;
  }

  const filePath = path.resolve('app_compiled', 'webworkers', workerPath);
  res.sendFile(filePath, {
    headers: {
      'Content-Type': 'application/javascript',
    },
  });
}

export { webWorkerResponder };
