// @flow

import express from 'express';
import bodyParser from 'body-parser';

import errorHandler from './error_handler';
import { sendIOSPushNotifs } from './push/ios_notifs';

const app = express();
app.use(bodyParser.json());
app.post('/ios_push_notifs', errorHandler(sendIOSPushNotifs));
app.listen(parseInt(process.env.PORT) || 3000, 'localhost');
