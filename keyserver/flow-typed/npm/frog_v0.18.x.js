// flow-typed signature: 8b45e30d3c592dc3c877fcba96c687fb
// flow-typed version: <<STUB>>/frog_v0.18.x/flow_v0.202.1

declare module 'frog' {
  declare type FrogOptions = {
    title: string,
  };

  declare type FrameResponse = {
    image: JSX.Element,
    intents: Array<>,
  };

  declare type TypedResponse<data> = {
    format:
      | 'castAction'
      | 'composerAction'
      | 'frame'
      | 'transaction'
      | 'image'
      | 'signature'
  } & OneOf<
    { data: data; status: 'success' } | { error: BaseError; status: 'error' }
  >

  declare type FrameResponseFn = (
    response: FrameResponse
  ) => TypedResponse<FrameResponse>;  
  );

  declare type FrameContext = {
    res: FrameResponseFn
  };

  declare export class Frog {
    frame(
      route: string, callback: (c: FrameContext) => FrogResponse
    ): void;
    constructor(options?: FrogOptions): this;
  }
}

