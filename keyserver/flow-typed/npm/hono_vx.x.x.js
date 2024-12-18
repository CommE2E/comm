// flow-typed signature: 06706c2a95e8f8228cf2ed3a7f3a1366
// flow-typed version: <<STUB>>/hono_v4.6.9/flow_v0.202.1

declare module 'hono' {

  declare export opaque type MiddlewareHandler;

  declare export class Hono {
    use(
      route: string,
      handler: MiddlewareHandler,
    ): mixed;
  }
}

declare module 'hono/cors' {
  import type { MiddlewareHandler } from 'hono';

  declare export var cors: ({
    +origin?: string,
    +allowMethods?: $ReadOnlyArray<string>,
  }) => MiddlewareHandler;
}

