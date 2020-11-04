// @flow

import express from 'express';
import cookieParser from 'cookie-parser';
import cluster from 'cluster';
import os from 'os';
import expressWs from 'express-ws';

import {
  jsonHandler,
  downloadHandler,
  htmlHandler,
  uploadHandler,
} from './responders/handlers';
import { onConnection } from './socket/socket';
import urlFacts from '../facts/url';
import './cron/cron';
import { jsonEndpoints } from './endpoints';
import { websiteResponder } from './responders/website-responders';
import { errorReportDownloadResponder } from './responders/report-responders';
import {
  multerProcessor,
  multimediaUploadResponder,
  uploadDownloadResponder,
} from './uploads/uploads';

const { baseRoutePath } = urlFacts;

if (cluster.isMaster) {
  const cpuCount = os.cpus().length;
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }
  cluster.on('exit', () => cluster.fork());
} else {
  const server = express();
  expressWs(server);
  server.use(express.json({ limit: '50mb' }));
  server.use(cookieParser());

  const router = express.Router();
  router.use('/images', express.static('images'));
  if (process.env.NODE_ENV === 'dev') {
    router.use('/fonts', express.static('fonts'));
  }
  router.use('/misc', express.static('misc'));
  router.use(
    '/.well-known',
    express.static(
      '.well-known',
      // Necessary for apple-app-site-association file
      {
        setHeaders: (res) => res.setHeader('Content-Type', 'application/json'),
      },
    ),
  );
  const compiledFolderOptions =
    process.env.NODE_ENV === 'dev'
      ? undefined
      : { maxAge: '1y', immutable: true };
  router.use('/compiled', express.static('compiled', compiledFolderOptions));
  router.use('/', express.static('icons'));

  for (const endpoint in jsonEndpoints) {
    // $FlowFixMe Flow thinks endpoint is string
    const responder = jsonEndpoints[endpoint];
    const expectCookieInvalidation = endpoint === 'log_out';
    router.post(
      `/${endpoint}`,
      jsonHandler(responder, expectCookieInvalidation),
    );
  }

  router.get(
    '/download_error_report/:reportID',
    downloadHandler(errorReportDownloadResponder),
  );
  router.get(
    '/upload/:uploadID/:secret',
    downloadHandler(uploadDownloadResponder),
  );

  // $FlowFixMe express-ws has side effects that can't be typed
  router.ws('/ws', onConnection);
  router.get('*', htmlHandler(websiteResponder));

  router.post(
    '/upload_multimedia',
    multerProcessor,
    uploadHandler(multimediaUploadResponder),
  );

  server.use(baseRoutePath, router);
  server.listen(parseInt(process.env.PORT, 10) || 3000, 'localhost');
}
