// @flow

import type { JSONResponder } from './responders/handlers';
import type { Endpoint } from 'lib/types/endpoints';

import express from 'express';
import cookieParser from 'cookie-parser';
import cluster from 'cluster';
import os from 'os';

import {
  jsonHandler,
  downloadHandler,
  htmlHandler,
} from './responders/handlers';
import {
  textMessageCreationResponder,
  messageFetchResponder,
} from './responders/message-responders';
import { updateActivityResponder } from './responders/activity-responders';
import { deviceTokenUpdateResponder } from './responders/device-responders';
import {
  userSubscriptionUpdateResponder,
  accountUpdateResponder,
  sendVerificationEmailResponder,
  sendPasswordResetEmailResponder,
  logOutResponder,
  accountDeletionResponder,
  accountCreationResponder,
  logInResponder,
  passwordUpdateResponder,
} from './responders/user-responders';
import { userSearchResponder } from './responders/search-responders';
import {
  entryFetchResponder,
  entryRevisionFetchResponder,
  entryCreationResponder,
  entryUpdateResponder,
  entryDeletionResponder,
  entryRestorationResponder,
} from './responders/entry-responders';
import {
  codeVerificationResponder,
} from './responders/verification-responders';
import {
  threadDeletionResponder,
  roleUpdateResponder,
  memberRemovalResponder,
  threadLeaveResponder,
  threadUpdateResponder,
  threadCreationResponder,
  threadJoinResponder,
} from './responders/thread-responders';
import { pingResponder } from './responders/ping-responders';
import { websiteResponder } from './responders/website-responders';
import {
  errorReportCreationResponder,
  errorReportFetchInfosResponder,
  errorReportDownloadHandler,
} from './responders/report-responders';
import urlFacts from '../facts/url';
import './cron';

const { baseRoutePath } = urlFacts;

const jsonEndpoints: {[id: Endpoint]: JSONResponder} = {
  'update_activity': updateActivityResponder,
  'update_user_subscription': userSubscriptionUpdateResponder,
  'update_device_token': deviceTokenUpdateResponder,
  'update_account': accountUpdateResponder,
  'send_verification_email': sendVerificationEmailResponder,
  'search_users': userSearchResponder,
  'send_password_reset_email': sendPasswordResetEmailResponder,
  'create_text_message': textMessageCreationResponder,
  'fetch_entries': entryFetchResponder,
  'fetch_entry_revisions': entryRevisionFetchResponder,
  'verify_code': codeVerificationResponder,
  'delete_thread': threadDeletionResponder,
  'create_entry': entryCreationResponder,
  'update_entry': entryUpdateResponder,
  'delete_entry': entryDeletionResponder,
  'restore_entry': entryRestorationResponder,
  'update_role': roleUpdateResponder,
  'remove_members': memberRemovalResponder,
  'leave_thread': threadLeaveResponder,
  'update_thread': threadUpdateResponder,
  'create_thread': threadCreationResponder,
  'fetch_messages': messageFetchResponder,
  'join_thread': threadJoinResponder,
  'ping': pingResponder,
  'log_out': logOutResponder,
  'delete_account': accountDeletionResponder,
  'create_account': accountCreationResponder,
  'log_in': logInResponder,
  'update_password': passwordUpdateResponder,
  'create_error_report': errorReportCreationResponder,
  'fetch_error_report_infos': errorReportFetchInfosResponder,
};

if (cluster.isMaster) {
  const cpuCount = os.cpus().length;
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }
  cluster.on('exit', worker => cluster.fork());
} else {
  const server = express();
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
  router.use('/compiled', express.static('compiled'));
  router.use('/', express.static('icons'));

  for (let endpoint in jsonEndpoints) {
    // $FlowFixMe Flow thinks endpoint is string
    const responder = jsonEndpoints[endpoint];
    router.post(`/${endpoint}`, jsonHandler(responder));
  }

  router.get(
    '/download_error_report/:reportID',
    downloadHandler(errorReportDownloadHandler),
  );
  router.get('*', htmlHandler(websiteResponder));

  server.use(baseRoutePath, router);
  server.listen(parseInt(process.env.PORT) || 3000, 'localhost');
}
