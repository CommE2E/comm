// @flow

import olm from '@commapp/olm';
import cluster from 'cluster';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import crypto from 'crypto';
import express from 'express';
import type { $Request, $Response } from 'express';
import expressWs from 'express-ws';
import os from 'os';
import qrcode from 'qrcode';
import stoppable from 'stoppable';

import './cron/cron.js';
import { qrCodeLinkURL } from 'lib/facts/links.js';
import { identityDeviceTypes } from 'lib/types/identity-service-types.js';
import { isDev } from 'lib/utils/dev-utils.js';
import { ignorePromiseRejections } from 'lib/utils/promises.js';
import sleep from 'lib/utils/sleep.js';

import { fetchDBVersion } from './database/db-version.js';
import { latestWrapInTransactionAndBlockRequestsVersion } from './database/migration-config.js';
import { migrate } from './database/migrations.js';
import { jsonEndpoints } from './endpoints.js';
import { logEndpointMetrics } from './middleware/endpoint-profiling.js';
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
import { createAndMaintainTunnelbrokerWebsocket } from './socket/tunnelbroker.js';
import {
  multerProcessor,
  multimediaUploadResponder,
  uploadDownloadResponder,
} from './uploads/uploads.js';
import { createAuthoritativeKeyserverConfigFiles } from './user/create-configs.js';
import { fetchIdentityInfo } from './user/identity.js';
import { authAndSaveIdentityInfo } from './user/login.js';
import { initENSCache } from './utils/ens-cache.js';
import { initFCCache } from './utils/fc-cache.js';
import { syncPlatformDetails } from './utils/identity-utils.js';
import { getContentSigningKey } from './utils/olm-utils.js';
import {
  isPrimaryNode,
  isSecondaryNode,
} from './utils/primary-secondary-utils.js';
import { getRunServerConfig } from './utils/server-utils.js';
import {
  prefetchAllURLFacts,
  getKeyserverURLFacts,
  getLandingURLFacts,
  getWebAppURLFacts,
  getWebAppCorsConfig,
} from './utils/urls.js';

const shouldDisplayQRCodeInTerminal = false;

void (async () => {
  const [webAppCorsConfig] = await Promise.all([
    getWebAppCorsConfig(),
    olm.init(),
    prefetchAllURLFacts(),
    initENSCache(),
    initFCCache(),
  ]);

  const keyserverURLFacts = getKeyserverURLFacts();
  const keyserverBaseRoutePath = keyserverURLFacts?.baseRoutePath;
  const landingBaseRoutePath = getLandingURLFacts()?.baseRoutePath;
  const webAppURLFacts = getWebAppURLFacts();
  const webAppBaseRoutePath = webAppURLFacts?.baseRoutePath;

  const compiledFolderOptions =
    process.env.NODE_ENV === 'development'
      ? undefined
      : { maxAge: '1y', immutable: true };

  let keyserverCorsOptions = null;
  if (webAppCorsConfig) {
    keyserverCorsOptions = {
      origin: webAppCorsConfig.domain,
      methods: ['GET', 'POST'],
    };
  }

  const isCPUProfilingEnabled = process.env.KEYSERVER_CPU_PROFILING_ENABLED;
  const areEndpointMetricsEnabled =
    process.env.KEYSERVER_ENDPOINT_METRICS_ENABLED;

  const listenAddress = (() => {
    if (process.env.COMM_LISTEN_ADDR) {
      return process.env.COMM_LISTEN_ADDR;
    } else if (process.env.NODE_ENV === 'development') {
      return undefined;
    } else {
      return 'localhost';
    }
  })();

  if (cluster.isMaster) {
    if (isPrimaryNode) {
      const healthCheckApp = express();
      healthCheckApp.use(express.json({ limit: '250mb' }));
      healthCheckApp.get('/health', (req: $Request, res: $Response) => {
        res.send('OK');
      });

      // We use stoppable to allow forcibly stopping the health check server
      // on the master process so that non-master processes can successfully
      // initialize their express servers on the same port without conflict
      const healthCheckServer = stoppable(
        healthCheckApp.listen(
          parseInt(process.env.PORT, 10) || 3000,
          listenAddress,
        ),
        0,
      );

      const didMigrationsSucceed: boolean = await migrate();
      if (!didMigrationsSucceed) {
        // The following line uses exit code 2 to ensure nodemon exits
        // in a dev environment, instead of restarting. Context provided
        // in https://github.com/remy/nodemon/issues/751
        process.exit(2);
      }

      if (healthCheckServer) {
        await new Promise((resolve, reject) => {
          healthCheckServer.stop(err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    }

    if (shouldDisplayQRCodeInTerminal && isPrimaryNode) {
      try {
        const aes256Key = crypto.randomBytes(32).toString('hex');
        const ed25519Key = await getContentSigningKey();

        const [identityInfo] = await Promise.all([
          fetchIdentityInfo(),
          createAndMaintainTunnelbrokerWebsocket(aes256Key),
        ]);

        if (!identityInfo) {
          console.log(
            '\nOpen the Comm app on your phone and scan the QR code below, or copy and paste this URL:\n',
          );
          const url = qrCodeLinkURL(
            aes256Key,
            ed25519Key,
            identityDeviceTypes.KEYSERVER,
          );
          console.log(url, '\n');
          console.log('How to find the scanner:\n');
          console.log('Go to \x1b[1mProfile\x1b[0m');
          console.log('Select \x1b[1mLinked devices\x1b[0m');
          console.log('Click \x1b[1mAdd\x1b[0m on the top right');

          qrcode.toString(url, (error, encodedURL) => console.log(encodedURL));
        }
      } catch (e) {
        console.log('Error generating QR code', e);
      }
    } else {
      // Allow login to be optional until staging environment is available
      try {
        await (async () => {
          // Should not be run by Landing or WebApp nodes
          if (!isPrimaryNode && !isSecondaryNode) {
            return;
          }

          // We await here to ensure that the keyserver has been provisioned a
          // commServicesAccessToken. In the future, this will be necessary for
          // many keyserver operations.
          let identityInfo = await fetchIdentityInfo();
          if (identityInfo && isPrimaryNode) {
            // We are using persisted auth metadata here, so we should attempt
            // to synchronize platform details with the identity service
            ignorePromiseRejections(syncPlatformDetails(identityInfo));
          }
          if (!identityInfo) {
            identityInfo = await authAndSaveIdentityInfo();
          }

          if (!isPrimaryNode) {
            return;
          }

          // We don't await here, as Tunnelbroker communication is not needed
          // for normal keyserver behavior yet. In addition, this doesn't
          // return information useful for other keyserver functions.
          ignorePromiseRejections(createAndMaintainTunnelbrokerWebsocket(null));

          if (process.env.NODE_ENV !== 'development') {
            return;
          }

          await createAuthoritativeKeyserverConfigFiles(identityInfo.userId);
        })();
      } catch (e) {
        console.warn(
          'Failed identity login. Login optional until staging environment is available',
        );
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

    server.get('/health', (req: $Request, res: $Response) => {
      res.send('OK');
    });

    server.listen(parseInt(process.env.PORT, 10) || 3000, listenAddress);

    if (isSecondaryNode) {
      let dbVersion = await fetchDBVersion();
      while (dbVersion < latestWrapInTransactionAndBlockRequestsVersion) {
        await sleep(5000);

        dbVersion = await fetchDBVersion();
      }
    }

    // Note - the order of router declarations matters. On prod we have
    // keyserverBaseRoutePath configured to '/', which means it's a catch-all.
    // If we call server.use on keyserverRouter first, it will catch all
    // requests and prevent webAppRouter and landingRouter from working
    // correctly. So we make sure that keyserverRouter goes last

    const runServerConfig = await getRunServerConfig();

    if (landingBaseRoutePath && runServerConfig.runLanding) {
      const landingRouter = express.Router<$Request, $Response>();
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

    if (webAppBaseRoutePath && runServerConfig.runWebApp) {
      const webAppRouter = express.Router<$Request, $Response>();
      webAppRouter.use('/images', express.static('images'));
      webAppRouter.use('/fonts', express.static('fonts'));
      webAppRouter.use('/misc', express.static('misc'));
      webAppRouter.use(
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
      webAppRouter.use(
        '/compiled',
        express.static('app_compiled', compiledFolderOptions),
      );
      webAppRouter.use('/', express.static('icons'));

      webAppRouter.get('/invite/:secret', inviteResponder);

      webAppRouter.get('/worker/:worker', webWorkerResponder);

      if (keyserverURLFacts) {
        webAppRouter.get(
          '/upload/:uploadID/:secret',
          (req: $Request, res: $Response) => {
            const { uploadID, secret } = req.params;
            const url = `${keyserverURLFacts.baseDomain}${keyserverURLFacts.basePath}upload/${uploadID}/${secret}`;
            res.redirect(url);
          },
        );
      }

      webAppRouter.get('*', htmlHandler(websiteResponder));

      server.use(webAppBaseRoutePath, webAppRouter);
    }

    if (keyserverBaseRoutePath && runServerConfig.runKeyserver) {
      const keyserverRouter = express.Router<$Request, $Response>();
      if (areEndpointMetricsEnabled) {
        keyserverRouter.use(logEndpointMetrics);
      }
      if (keyserverCorsOptions) {
        keyserverRouter.use(cors(keyserverCorsOptions));
      }

      for (const endpoint in jsonEndpoints) {
        // $FlowFixMe Flow thinks endpoint is string
        const responder = jsonEndpoints[endpoint];
        const expectCookieInvalidation = endpoint === 'log_out';
        keyserverRouter.post(
          `/${endpoint}`,
          jsonHandler(responder, expectCookieInvalidation),
        );
      }

      keyserverRouter.get(
        '/download_error_report/:reportID',
        downloadHandler(errorReportDownloadResponder),
      );
      keyserverRouter.get(
        '/upload/:uploadID/:secret',
        downloadHandler(uploadDownloadResponder),
      );

      // $FlowFixMe express-ws has side effects that can't be typed
      keyserverRouter.ws('/ws', onConnection);

      keyserverRouter.post(
        '/upload_multimedia',
        multerProcessor,
        uploadHandler(multimediaUploadResponder),
      );

      server.use(keyserverBaseRoutePath, keyserverRouter);
    }

    if (isDev && webAppURLFacts) {
      const oldPath = '/comm/';
      server.all(`${oldPath}*`, (req: $Request, res: $Response) => {
        const endpoint = req.url.slice(oldPath.length);
        const newURL = `${webAppURLFacts.baseDomain}${webAppURLFacts.basePath}${endpoint}`;
        res.redirect(newURL);
      });
    }
  }
})();
