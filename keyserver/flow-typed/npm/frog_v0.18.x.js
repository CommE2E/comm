// flow-typed signature: 8b45e30d3c592dc3c877fcba96c687fb
// flow-typed version: <<STUB>>/frog_v0.18.x/flow_v0.202.1

declare module 'frog' {

  import type { Fetch, HonoRequest } from '@hono/node-server';
  import type { Hono } from 'hono';

  declare type FrameResponse = {
    +image: React$Node,
    +intents: $ReadOnlyArray<React$Node>,
    ...
  };

  declare export var Button: {
    Link: React$ComponentType<{
      +children: React$Node,
      +href: string,
      ...
    }>,
    ...
  };

  declare opaque type FrogResponse;
  declare opaque type FrogRequest;

  declare type FrameContext = {
    +res: (response: FrameResponse) => FrogResponse,
    +req: HonoRequest,
    ...
  };

  declare type FrogOptions = {
    +title: string,
    ...
  };

  declare export class Frog {
    constructor(options?: FrogOptions): this;
    frame(
      route: string,
      callback: (c: FrameContext) => Promise<FrogResponse> | FrogResponse,
    ): void;
    hono: Hono,
    fetch: Fetch,
  }
}
