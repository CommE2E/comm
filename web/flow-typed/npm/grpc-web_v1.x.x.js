// flow-typed signature: 7bfbf382213ab8a2a77e02cc8ce971e4
// flow-typed version: <<STUB>>/grpc-web_v1.4.2/flow_v0.182.0

declare module 'grpc-web' {

  declare export type Metadata = { +[s: string]: string };

  declare export type StatusCode =
    | 0   // OK
    | 1   // CANCELLED
    | 2   // UNKNOWN
    | 3   // INVALID_ARGUMENT
    | 4   // DEADLINE_EXCEEDED
    | 5   // NOT_FOUND
    | 6   // ALREADY_EXISTS
    | 7   // PERMISSION_DENIED
    | 8   // RESOURCE_EXHAUSTED
    | 9   // FAILED_PRECONDITION
    | 10  // ABORTED
    | 11  // OUT_OF_RANGE
    | 12  // UNIMPLEMENTED
    | 13  // INTERNAL
    | 14  // UNAVAILABLE
    | 15  // DATA_LOSS
    | 16; // UNAUTHENTICATED

  declare export type Status = {
    +code: number,
    +details: string,
    +metadata?: Metadata,
  };

  declare export class RpcError extends Error {
    constructor(code: StatusCode, message: string, metadata: Metadata): void;
    code: StatusCode;
    metadata: Metadata;
  }

  declare export class ClientReadableStream<RESP> {
    on(eventType: "error", callback: (err: RpcError) => void): this;
    on(eventType: "status", callback: (status: Status) => void): this;
    on(eventType: "metadata", callback: (status: Metadata) => void): this;
    on(eventType: "data", callback: (response: RESP) => void): this;
    on(eventType: "end", callback: () => void): this;

    removeListener(eventType: "error", callback: (err: RpcError) => void): void;
    removeListener(
      eventType: "status",
      callback: (status: Status) => void,
    ): void;
    removeListener(
      eventType: "metadata",
      callback: (status: Metadata) => void,
    ): void;
    removeListener(eventType: "data", callback: (response: RESP) => void): void;
    removeListener(eventType: "end", callback: () => void): void;
    cancel(): void;
  }

}
