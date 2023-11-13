// flow-typed signature: dc90000dd676bedabc5cc17a78b6960e
// flow-typed version: <<STUB>>/cookie-parser_v1.4.4/flow_v0.202.1

declare module 'cookie-parser' {
  import type { Middleware } from 'express';

  declare function cookieParser(
    secret?: string | Array<string>,
    options?: mixed
  ): Middleware<>;

  declare export default typeof cookieParser;
}
