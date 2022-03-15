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
import {
  getGlobalURLFacts,
  getLandingURLFacts,
  generateAllRoutePaths,
  generateBaseAndCommAppRoutePaths,
} from './utils/urls';

const { baseRoutePath } = getGlobalURLFacts();
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

  const router = express.Router();
  for (const routePath of generateAllRoutePaths('images')) {
    router.use(routePath, express.static('images'));
  }
  for (const routePath of generateAllRoutePaths('fonts')) {
    router.use(routePath, express.static('fonts'));
  }
  for (const routePath of generateBaseAndCommAppRoutePaths('misc')) {
    router.use(routePath, express.static('misc'));
  }
  router.use(
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
  for (const routePath of generateBaseAndCommAppRoutePaths('compiled')) {
    router.use(
      routePath,
      express.static('app_compiled', compiledFolderOptions),
    );
  }
  router.use(
    `${landingBaseRoutePath}compiled`,
    express.static('landing_compiled', compiledFolderOptions),
  );
  for (const routePath of generateBaseAndCommAppRoutePaths('')) {
    router.use(routePath, express.static('icons'));
  }
  router.use(`${landingBaseRoutePath}`, express.static('landing_icons'));

  for (const endpoint in jsonEndpoints) {
    // $FlowFixMe Flow thinks endpoint is string
    const responder = jsonEndpoints[endpoint];
    const expectCookieInvalidation = endpoint === 'log_out';
    for (const routePath of generateBaseAndCommAppRoutePaths(endpoint)) {
      router.post(routePath, jsonHandler(responder, expectCookieInvalidation));
    }
  }

  router.post(
    `${landingBaseRoutePath}subscribe_email`,
    emailSubscriptionResponder,
  );

  for (const routePath of generateBaseAndCommAppRoutePaths(
    'create_version/:deviceType/:codeVersion',
  )) {
    router.get(routePath, httpGetHandler(createNewVersionResponder));
  }
  for (const routePath of generateBaseAndCommAppRoutePaths(
    'mark_version_deployed/:deviceType/:codeVersion',
  )) {
    router.get(routePath, httpGetHandler(markVersionDeployedResponder));
  }
  for (const routePath of generateBaseAndCommAppRoutePaths(
    'download_error_report/:reportID',
  )) {
    router.get(routePath, downloadHandler(errorReportDownloadResponder));
  }
  for (const routePath of generateBaseAndCommAppRoutePaths(
    'upload/:uploadID/:secret',
  )) {
    router.get(routePath, downloadHandler(uploadDownloadResponder));
  }

  // $FlowFixMe express-ws has side effects that can't be typed
  router.ws(`${baseRoutePath}ws`, onConnection);
  router.get(`${landingBaseRoutePath}*`, landingHandler);
  router.get('*', htmlHandler(websiteResponder));

  for (const routePath of generateBaseAndCommAppRoutePaths(
    'upload_multimedia',
  )) {
    router.post(
      routePath,
      multerProcessor,
      uploadHandler(multimediaUploadResponder),
    );
  }

  server.use(baseRoutePath, router);
  server.listen(parseInt(process.env.PORT, 10) || 3000, 'localhost');
}
