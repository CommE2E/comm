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
import './cron';
import { jsonEndpoints } from './endpoints';
import { websiteResponder } from './responders/website-responders';
import { errorReportDownloadResponder } from './responders/report-responders';
import {
  multerProcessor,
  multimediaMessageCreationResponder,
} from './uploads/uploads';

const { baseRoutePath } = urlFacts;

if (cluster.isMaster) {
  const cpuCount = os.cpus().length;
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }
  cluster.on('exit', worker => cluster.fork());
} else {
  const server = express();
  expressWs(server);
  server.use(express.json({ limit: "50mb" }));
  server.use(cookieParser());

  const router = express.Router();
  router.use('/images', express.static('images'));
  router.use('/fonts', express.static('fonts'));
  router.use(
    '/.well-known',
    express.static(
      '.well-known',
      // Necessary for apple-app-site-association file
      { setHeaders: res => res.setHeader("Content-Type", "application/json") },
    ),
  );
  const compiledFolderOptions = process.env.NODE_ENV === "dev"
    ? undefined
    : { maxAge: "1y", immutable: true };
  router.use('/compiled', express.static('compiled', compiledFolderOptions));
  router.use('/', express.static('icons'));

  for (let endpoint in jsonEndpoints) {
    // $FlowFixMe Flow thinks endpoint is string
    const responder = jsonEndpoints[endpoint];
    router.post(`/${endpoint}`, jsonHandler(responder));
  }

  router.get(
    '/download_error_report/:reportID',
    downloadHandler(errorReportDownloadResponder),
  );
  // $FlowFixMe express-ws has side effects that can't be typed
  router.ws('/ws', onConnection);
  router.get('*', htmlHandler(websiteResponder));

  router.post(
    '/create_multimedia_message',
    multerProcessor,
    uploadHandler(multimediaMessageCreationResponder),
  );

  server.use(baseRoutePath, router);
  server.listen(parseInt(process.env.PORT) || 3000, 'localhost');
}
