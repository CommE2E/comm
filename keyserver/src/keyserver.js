// @flow

import olm from '@commapp/olm';
import cluster from 'cluster';
import cookieParser from 'cookie-parser';
import express from 'express';
import expressWs from 'express-ws';
import os from 'os';

import './cron/cron.js';
import { migrate } from './database/migrations.js';
import { jsonEndpoints } from './endpoints.js';
import { emailSubscriptionResponder } from './responders/comm-landing-responders.js';
import {
  jsonHandler,
  downloadHandler,
  htmlHandler,
  uploadHandler,
} from './responders/handlers.js';
import landingHandler from './responders/landing-handler.js';
import { errorReportDownloadResponder } from './responders/report-responders.js';
import {
  inviteResponder,
  websiteResponder,
} from './responders/website-responders.js';
import { webWorkerResponder } from './responders/webworker-responders.js';
import { onConnection } from './socket/socket.js';
import {
  multerProcessor,
  multimediaUploadResponder,
  uploadDownloadResponder,
} from './uploads/uploads.js';
import { initENSCache } from './utils/ens-cache.js';
import {
  prefetchAllURLFacts,
  getSquadCalURLFacts,
  getLandingURLFacts,
  getCommAppURLFacts,
} from './utils/urls.js';

(async () => {
  await Promise.all([olm.init(), prefetchAllURLFacts(), initENSCache()]);

  const squadCalBaseRoutePath = getSquadCalURLFacts()?.baseRoutePath;
  const landingBaseRoutePath = getLandingURLFacts()?.baseRoutePath;
  const commAppBaseRoutePath = getCommAppURLFacts()?.baseRoutePath;

  const compiledFolderOptions =
    process.env.NODE_ENV === 'development'
      ? undefined
      : { maxAge: '1y', immutable: true };

  if (cluster.isMaster) {
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
    cluster.on('exit', () => cluster.fork());
  } else {
    const server = express();
    expressWs(server);
    server.use(express.json({ limit: '250mb' }));
    server.use(cookieParser());

    const setupAppRouter = router => {
      router.use('/images', express.static('images'));
      router.use('/fonts', express.static('fonts'));
      router.use('/misc', express.static('misc'));
      router.use(
        '/.well-known',
        express.static(
          '.well-known',
          // Necessary for apple-app-site-association file
          {
            setHeaders: res =>
              res.setHeader('Content-Type', 'application/json'),
          },
        ),
      );
      router.use(
        '/compiled',
        express.static('app_compiled', compiledFolderOptions),
      );
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

      router.get('/invite/:secret', inviteResponder);

      // $FlowFixMe express-ws has side effects that can't be typed
      router.ws('/ws', onConnection);
      router.get('/worker/:worker', webWorkerResponder);
      router.get('*', htmlHandler(websiteResponder));

      router.post(
        '/upload_multimedia',
        multerProcessor,
        uploadHandler(multimediaUploadResponder),
      );
    };

    // Note - the order of router declarations matters. On prod we have
    // squadCalBaseRoutePath configured to '/', which means it's a catch-all. If
    // we call server.use on squadCalRouter first, it will catch all requests
    // and prevent commAppRouter and landingRouter from working correctly. So we
    // make sure that squadCalRouter goes last

    server.get('/invite/:secret', inviteResponder);

    if (landingBaseRoutePath) {
      const landingRouter = express.Router();
      landingRouter.get('/invite/:secret', inviteResponder);
      landingRouter.use(
        '/.well-known',
        express.static(
          '.well-known',
          // Necessary for apple-app-site-association file
          {
            setHeaders: res =>
              res.setHeader('Content-Type', 'application/json'),
          },
        ),
      );
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
    }

    if (commAppBaseRoutePath) {
      const commAppRouter = express.Router();
      setupAppRouter(commAppRouter);
      server.use(commAppBaseRoutePath, commAppRouter);
    }

    if (squadCalBaseRoutePath) {
      const squadCalRouter = express.Router();
      setupAppRouter(squadCalRouter);
      server.use(squadCalBaseRoutePath, squadCalRouter);
    }

    const listenAddress = (() => {
      if (process.env.COMM_LISTEN_ADDR) {
        return process.env.COMM_LISTEN_ADDR;
      } else if (process.env.NODE_ENV === 'development') {
        return undefined;
      } else {
        return 'localhost';
      }
    })();

    server.listen(parseInt(process.env.PORT, 10) || 3000, listenAddress);
  }
})();
