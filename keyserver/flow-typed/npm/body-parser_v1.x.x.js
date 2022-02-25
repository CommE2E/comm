// flow-typed signature: bac0ee66e0653772d037dc47b51a5e1f
// flow-typed version: da30fe6876/body-parser_v1.x.x/flow_>=v0.25.x

declare module "body-parser" {
  import type { Middleware, $Request, $Response } from "express";

  declare type Options = {
    inflate?: boolean,
    limit?: number | string,
    type?: string | string[] | ((req: $Request) => any),
    verify?: (
      req: $Request,
      res: $Response,
      buf: Buffer,
      encoding: string
    ) => void
  };

  declare type OptionsText = Options & {
    reviver?: (key: string, value: any) => any,
    strict?: boolean
  };

  declare type OptionsJson = Options & {
    reviver?: (key: string, value: any) => any,
    strict?: boolean
  };

  declare type OptionsUrlencoded = Options & {
    extended?: boolean,
    parameterLimit?: number
  };

  declare function json<Request: $Request, Response: $Response>(
    options?: OptionsJson,
  ): Middleware<Request, Response>;

  declare function raw<Request: $Request, Response: $Response>(
    options?: Options,
  ): Middleware<Request, Response>;

  declare function text<Request: $Request, Response: $Response>(
    options?: OptionsText,
  ): Middleware<Request, Response>;

  declare function urlencoded<Request: $Request, Response: $Response>(
    options?: OptionsUrlencoded,
  ): Middleware<Request, Response>;
}
