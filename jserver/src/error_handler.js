// @flow

import type { $Response, $Request } from 'express';

type OurHandler = (req: $Request, res: $Response) => Promise<*>;

export default function errorHandler(handler: OurHandler) {
  return async (req: $Request, res: $Response) => {
    try {
      const result = await handler(req, res);
      const stringResult = typeof result === "object"
        ? JSON.stringify(result)
        : result;
      res.send(stringResult);
    } catch (error) {
      res.status(500).send(error.message);
    }
  };
}
