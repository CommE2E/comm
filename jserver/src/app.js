// @flow

import express from 'express';
import bodyParser from 'body-parser';

import errorHandler from './error_handler';
import { rescindPushNotifs } from './push/rescind';
import { messageCreationResponder } from './responders/message-responders';

const app = express();
app.use(bodyParser.json());
app.post('/rescind_push_notifs', errorHandler(rescindPushNotifs));
app.post('/create_messages', errorHandler(messageCreationResponder));
app.listen(parseInt(process.env.PORT) || 3000, 'localhost');
