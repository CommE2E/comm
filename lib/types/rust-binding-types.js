// @flow

type TunnelbrokerMessageToDeliver = {
  +messageId: string,
  +fromDeviceId: string,
  +payload: string,
};

type tunnelbrokerOnReceiveCallback = (
  err: Error | null,
  message: TunnelbrokerMessageToDeliver,
) => mixed;

declare class TunnelbrokerClientClass {
  constructor(
    deviceId: string,
    onReceiveCallback: tunnelbrokerOnReceiveCallback,
  ): TunnelbrokerClientClass;
  publish(toDeviceId: string, payload: string): Promise<void>;
}

type RustNativeBindingAPI = {
  +registerUser: (
    userId: string,
    deviceId: string,
    username: string,
    password: string,
    userPublicKey: string,
  ) => Promise<string>,
  +deleteUser: (userId: string) => Promise<boolean>,
  +TunnelbrokerClient: Class<TunnelbrokerClientClass>,
};

export type { RustNativeBindingAPI };
