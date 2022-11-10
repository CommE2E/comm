// @flow

export type GetUserPublicKeyRequest = {
  +userID?: string,
  +deviceID?: string,
};

export type GetUserPublicKeyResponse__Output = {
  +publicKey: string,
};

export type MetadataValue = string | Buffer;

export type MetadataOptions = {
  +idempotentRequest?: boolean,
  +waitForReady?: boolean,
  +cacheableRequest?: boolean,
  +corked?: boolean,
};
export type MetadataObject = Map<string, MetadataValue[]>;

declare export class Metadata {
  internalRepr: MetadataObject;
  constructor(options: MetadataOptions): this;

  set(key: string, value: MetadataValue): void;

  add(key: string, value: MetadataValue): void;

  remove(key: string): void;

  get(key: string): MetadataValue[];

  getMap(): {
    [key: string]: MetadataValue,
    ...
  };

  clone(): Metadata;

  merge(other: Metadata): void;
  setOptions(options: MetadataOptions): void;
  getOptions(): MetadataOptions;

  toHttp2Headers(): mixed;

  toJSON(): { [key: string]: MetadataValue[] };

  static fromHttp2Headers(headers: mixed): Metadata;
}

declare export var Status: {
  +OK: 0, // 0
  +CANCELLED: 1, // 1
  +UNKNOWN: 2, // 2
  +INVALID_ARGUMENT: 3, // 3
  +DEADLINE_EXCEEDED: 4, // 4
  +NOT_FOUND: 5, // 5
  +ALREADY_EXISTS: 6, // 6
  +PERMISSION_DENIED: 7, // 7
  +RESOURCE_EXHAUSTED: 8, // 8
  +FAILED_PRECONDITION: 9, // 9
  +ABORTED: 10, // 10
  +OUT_OF_RANGE: 11, // 11
  +UNIMPLEMENTED: 12, // 12
  +INTERNAL: 13, // 13
  +UNAVAILABLE: 14, // 14
  +DATA_LOSS: 15, // 15
  +UNAUTHENTICATED: 16, // 16
};

export type WriteCallback = (error?: Error | null) => void;
export type MessageContext = {
  +callback?: WriteCallback,
  +flags?: number,
};

export type StatusObject = {
  +code: typeof Status,
  +details: string,
  +metadata: Metadata,
};

export type InterceptingListener = {
  +onReceiveMetadata: (metadata: Metadata) => void,
  +onReceiveMessage: (message: mixed) => void,
  +onReceiveStatus: (status: StatusObject) => void,
};

export type InterceptingCallInterface = {
  +cancelWithStatus: (status: typeof Status, details: string) => void,
  +getPeer: () => string,
  +start: (metadata: Metadata, listener?: $Exact<InterceptingListener>) => void,
  +sendMessageWithContext: (context: MessageContext, message: mixed) => void,
  +sendMessage: (message: mixed) => void,
  +startRead: () => void,
  +halfClose: () => void,
};

export type EmitterAugmentation1<Name: string | Symbol, Arg> = {
  +addListener: (event: Name, listener: (arg1: Arg) => void) => ClientUnaryCall,
  +emit: (event: Name, arg1: Arg) => boolean,
  +on: (event: Name, listener: (arg1: Arg) => void) => ClientUnaryCall,
  +once: (event: Name, listener: (arg1: Arg) => void) => ClientUnaryCall,
  +prependListener: (
    event: Name,
    listener: (arg1: Arg) => void,
  ) => ClientUnaryCall,
  +prependOnceListener: (
    event: Name,
    listener: (arg1: Arg) => void,
  ) => ClientUnaryCall,
  +removeListener: (
    event: Name,
    listener: (arg1: Arg) => void,
  ) => ClientUnaryCall,
};

export type ClientUnaryCall = {
  ...{
    +call?: InterceptingCallInterface,
    +cancel: () => void,
    +getPeer: () => string,
  },
  ...EmitterAugmentation1<'metadata', Metadata>,
  ...EmitterAugmentation1<'status', StatusObject>,
  ...
} & events$EventEmitter;

export type RequestCallback<ResponseType> = (
  err: Error | null,
  value?: ResponseType,
) => void;

export type IdentityServiceClient = {
  getUserPublicKey(
    argument: GetUserPublicKeyRequest,
    callback: RequestCallback<GetUserPublicKeyResponse__Output>,
  ): ClientUnaryCall,
  ...
};
