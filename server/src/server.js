// @flow

import cluster from 'cluster';
import cookieParser from 'cookie-parser';
import express from 'express';
import expressWs from 'express-ws';
import os from 'os';

import './cron/cron';
import { migrate } from './database/migrations';
import { jsonEndpoints } from './endpoints';
import { emailSubscriptionResponder } from './responders/comm-landing-responders';
import {
  jsonHandler,
  httpGetHandler,
  downloadHandler,
  htmlHandler,
  uploadHandler,
} from './responders/handlers';
import landingHandler from './responders/landing-handler';
import { errorReportDownloadResponder } from './responders/report-responders';
import {
  createNewVersionResponder,
  markVersionDeployedResponder,
} from './responders/version-responders';
import { websiteResponder } from './responders/website-responders';
import { onConnection } from './socket/socket';
import {
  multerProcessor,
  multimediaUploadResponder,
  uploadDownloadResponder,
} from './uploads/uploads';
import { getSquadCalURLFacts, getLandingURLFacts } from './utils/urls';

const squadCalBaseRoutePath = getSquadCalURLFacts().baseRoutePath;
const landingBaseRoutePath = getLandingURLFacts().baseRoutePath;

if (cluster.isMaster) {
  (async () => {
    const didMigrationsSucceed: boolean = await migrate();
    if (!didMigrationsSucceed) {
      // The following line uses exit code 2 to ensure nodemon exits
      // in a dev environment, instead of restarting. Context provided
      // in https://github.com/remy/nodemon/issues/751
      process.exit(2);
    }
    const cpuCount = os.cpus().length;
    for (let i = 0; i < cpuCount; i++) {
      cluster.fork();
    }
  })();
  cluster.on('exit', () => cluster.fork());
} else {
  const server = express();
  expressWs(server);
  server.use(express.json({ limit: '50mb' }));
  server.use(cookieParser());

  const squadCalRouter = express.Router();
  squadCalRouter.use('/images', express.static('images'));
  squadCalRouter.use('/fonts', express.static('fonts'));
  squadCalRouter.use('/misc', express.static('misc'));
  squadCalRouter.use(
    '/.well-known',
    express.static(
      '.well-known',
      // Necessary for apple-app-site-association file
      {
        setHeaders: res => res.setHeader('Content-Type', 'application/json'),
      },
    ),
  );
  const compiledFolderOptions =
    process.env.NODE_ENV === 'development'
      ? undefined
      : { maxAge: '1y', immutable: true };
  squadCalRouter.use(
    '/compiled',
    express.static('app_compiled', compiledFolderOptions),
  );
  squadCalRouter.use('/', express.static('icons'));

  for (const endpoint in jsonEndpoints) {
    // $FlowFixMe Flow thinks endpoint is string
    const responder = jsonEndpoints[endpoint];
    const expectCookieInvalidation = endpoint === 'log_out';
    squadCalRouter.post(
      `/${endpoint}`,
      jsonHandler(responder, expectCookieInvalidation),
    );
  }

  squadCalRouter.get(
    '/create_version/:deviceType/:codeVersion',
    httpGetHandler(createNewVersionResponder),
  );
  squadCalRouter.get(
    '/mark_version_deployed/:deviceType/:codeVersion',
    httpGetHandler(markVersionDeployedResponder),
  );

  squadCalRouter.get(
    '/download_error_report/:reportID',
    downloadHandler(errorReportDownloadResponder),
  );
  squadCalRouter.get(
    '/upload/:uploadID/:secret',
    downloadHandler(uploadDownloadResponder),
  );

  // $FlowFixMe express-ws has side effects that can't be typed
  squadCalRouter.ws('/ws', onConnection);
  squadCalRouter.get('*', htmlHandler(websiteResponder));

  squadCalRouter.post(
    '/upload_multimedia',
    multerProcessor,
    uploadHandler(multimediaUploadResponder),
  );

  server.use(squadCalBaseRoutePath, squadCalRouter);

  const landingRouter = express.Router();
  landingRouter.use('/images', express.static('images'));
  landingRouter.use('/fonts', express.static('fonts'));
  landingRouter.use(
    '/compiled',
    express.static('landing_compiled', compiledFolderOptions),
  );
  landingRouter.use('/', express.static('landing_icons'));
  landingRouter.post('/subscribe_email', emailSubscriptionResponder);
  landingRouter.get('*', landingHandler);

  server.use(landingBaseRoutePath, landingRouter);

  server.listen(parseInt(process.env.PORT, 10) || 3000, 'localhost');
}
