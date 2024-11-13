// flow-typed signature: 8b45e30d3c592dc3c877fcba96c687fb
// flow-typed version: <<STUB>>/frog_v0.18.x/flow_v0.202.1

declare module 'frog' {

  import type { Fetch } from '@hono/node-server';

  declare type FrameResponse = {
    +image: React$Node,
    +intents: $ReadOnlyArray<React$Node>,
    ...
  };

  declare export var Button: React$ComponentType<{
    +value: string,
    +children: React$Node,
    ...
  }>;

  declare opaque type FrogResponse;

  declare type FrameContext = {
    +res: (response: FrameResponse) => FrogResponse,
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
      callback: (c: FrameContext) => FrogResponse,
    ): void;
    fetch: Fetch,
  }
}
