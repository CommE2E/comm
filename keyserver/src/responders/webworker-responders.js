// @flow

import type { $Request, $Response } from 'express';
import path from 'path';

export function webWorkerResponder(req: $Request, res: $Response) {
  let workerPath;
  let options = {};

  if (req.params.worker === 'notif') {
    workerPath = 'pushNotif.build.cjs';
    options = {
      headers: {
        'Content-Type': 'application/javascript',
        'Service-Worker-Allowed': '/',
      },
    };
  }

  if (!workerPath) {
    res.sendStatus(404);
    return;
  }

  res.sendFile(path.resolve('app_compiled', 'webworkers', workerPath), options);
}
