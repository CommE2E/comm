// @flow

import olm from '@commapp/olm';
import cluster from 'cluster';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import express from 'express';
import expressWs from 'express-ws';
import os from 'os';
import qrcode from 'qrcode';

import './cron/cron.js';
import { qrCodeLinkURL } from 'lib/facts/links.js';

import { migrate } from './database/migrations.js';
import { jsonEndpoints } from './endpoints.js';
import { logEndpointMetrics } from './middleware/endpoint-profiling.js';
import { emailSubscriptionResponder } from './responders/comm-landing-responders.js';
import {
  jsonHandler,
  downloadHandler,
  handleAsyncPromise,
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
import { createAndMaintainTunnelbrokerWebsocket } from './socket/tunnelbroker.js';
import {
  multerProcessor,
  multimediaUploadResponder,
  uploadDownloadResponder,
} from './uploads/uploads.js';
import { verifyUserLoggedIn } from './user/login.js';
import { initENSCache } from './utils/ens-cache.js';
import { getContentSigningKey } from './utils/olm-utils.js';
import {
  prefetchAllURLFacts,
  getSquadCalURLFacts,
  getLandingURLFacts,
  getCommAppURLFacts,
} from './utils/urls.js';

const shouldDisplayQRCodeInTerminal = false;

(async () => {
  await Promise.all([olm.init(), prefetchAllURLFacts(), initENSCache()]);

  const squadCalBaseRoutePath = getSquadCalURLFacts()?.baseRoutePath;
  const landingBaseRoutePath = getLandingURLFacts()?.baseRoutePath;
  const commAppBaseRoutePath = getCommAppURLFacts()?.baseRoutePath;

  const compiledFolderOptions =
    process.env.NODE_ENV === 'development'
      ? undefined
      : { maxAge: '1y', immutable: true };

  const isCPUProfilingEnabled = process.env.KEYSERVER_CPU_PROFILING_ENABLED;
  const areEndpointMetricsEnabled =
    process.env.KEYSERVER_ENDPOINT_METRICS_ENABLED;

  if (cluster.isMaster) {
    const didMigrationsSucceed: boolean = await migrate();
    if (!didMigrationsSucceed) {
      // The following line uses exit code 2 to ensure nodemon exits
      // in a dev environment, instead of restarting. Context provided
      // in https://github.com/remy/nodemon/issues/751
      process.exit(2);
    }

    // Allow login to be optional until staging environment is available
    try {
      // We await here to ensure that the keyserver has been provisioned a
      // commServicesAccessToken. In the future, this will be necessary for
      // many keyserver operations.
      const identityInfo = await verifyUserLoggedIn();
      // We don't await here, as Tunnelbroker communication is not needed for
      // normal keyserver behavior yet. In addition, this doesn't return
      // information useful for other keyserver functions.
      handleAsyncPromise(createAndMaintainTunnelbrokerWebsocket(identityInfo));
    } catch (e) {
      console.warn('failed_identity_login');
    }

    if (shouldDisplayQRCodeInTerminal) {
      try {
        const aes256Key = crypto.randomBytes(32).toString('hex');
        const ed25519Key = await getContentSigningKey();

        console.log(
          '\nOpen the Comm app on your phone and scan the QR code below\n',
        );
        console.log('How to find the scanner:\n');
        console.log('Go to \x1b[1mProfile\x1b[0m');
        console.log('Select \x1b[1mLinked devices\x1b[0m');
        console.log('Click \x1b[1mAdd\x1b[0m on the top right');

        const url = qrCodeLinkURL(aes256Key, ed25519Key);
        qrcode.toString(url, (error, encodedURL) => console.log(encodedURL));
      } catch (e) {
        console.log('Error generating QR code', e);
      }
    }

    if (!isCPUProfilingEnabled) {
      const cpuCount = os.cpus().length;
      for (let i = 0; i < cpuCount; i++) {
        cluster.fork();
      }
      cluster.on('exit', () => cluster.fork());
    }
  }

  if (!cluster.isMaster || isCPUProfilingEnabled) {
    const server = express();
    server.use(compression());
    expressWs(server);
    server.use(express.json({ limit: '250mb' }));
    server.use(cookieParser());

    const setupAppRouter = router => {
      if (areEndpointMetricsEnabled) {
        router.use(logEndpointMetrics);
      }
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
