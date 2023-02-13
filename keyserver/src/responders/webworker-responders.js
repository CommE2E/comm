// @flow

import type { $Request, $Response } from 'express';
import path from 'path';

function webWorkerResponder(req: $Request, res: $Response): void {
  let workerPath;
  let headers = { 'Content-Type': 'application/javascript' };

  if (req.params.worker === 'notif') {
    workerPath = 'pushNotif.build.js';
    headers = {
      ...headers,
      'Service-Worker-Allowed': '/',
    };
  }

  if (!workerPath) {
    res.sendStatus(404);
    return;
  }

  const filePath = path.resolve('app_compiled', 'webworkers', workerPath);
  res.sendFile(filePath, {
    headers,
  });
}

export { webWorkerResponder };
