// flow-typed signature: 27d95010f07acc1758d5b0014afb152c
// flow-typed version: <<STUB>>/@hono/node-server_v1.13.7/flow_v0.202.1

declare module '@hono/node-server' {

  declare export opaque type Fetch;

  declare export var serve: ({
    +fetch?: ?Fetch,
    +port?: ?number,
    ...
  }) => mixed;

  declare export class HonoRequest {
    param(): { +[key: string]: string };
  }
}

declare module '@hono/node-server/serve-static' {

  import type { MiddlewareHandler } from 'hono';

  declare export type ServeStaticOptions = {
    +path: ?string,
    ...
  }

  declare export var serveStatic: ServeStaticOptions => MiddlewareHandler;
}
