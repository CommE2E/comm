// @flow

import type { $Response, $Request } from 'express';

import express from 'express';

import { pluralize } from 'lib/utils/text-utils';

const app = express();

app.get('/', function(req: $Request, res: $Response) {
  res.send(pluralize(['one', 'two', 'three']));
});

app.listen(process.env.PORT || 3000);
