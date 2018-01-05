// @flow

import type { $Response, $Request } from 'express';

type OurHandler = (req: $Request, res: $Response) => Promise<*>;

export default function errorHandler(handler: OurHandler) {
  return async (req: $Request, res: $Response) => {
    try {
      const result = await handler(req, res);
      if (res.headersSent) {
        return;
      } else if (typeof result === "object") {
        res.json(result);
      } else {
        res.send(result);
      }
    } catch (error) {
      console.warn(error);
      if (!res.headersSent) {
        res.status(500).send(error.message);
      }
    }
  };
}
