// @flow

type tunnelBrokerOnReceiveCallback = (
  err: Error | null,
  payload: string,
) => any;

interface TunnelbrokerClientClass {
  new(
    deviceId: string,
    onReceiveCallback: tunnelBrokerOnReceiveCallback,
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
  +TunnelbrokerClient: (
    deviceId: string,
    onReceiveCallback: tunnelBrokerOnReceiveCallback,
  ) => TunnelbrokerClientClass,
};

export type { RustNativeBindingAPI };
