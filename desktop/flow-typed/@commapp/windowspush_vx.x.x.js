// @flow

declare module '@commapp/windowspush' {
  declare export class PushNotificationCreateChannelStatus {
    +status: PushNotificationChannelStatus;
    +extendedError: number;
    +retryCount: number;
  }

  declare export class PushNotificationsContract {}

  declare export type PushNotificationChannelStatus = {
    +inProgress: 0,
    +inProgressRetry: 1,
    +completedSuccess: 2,
    +completedFailure: 3,
  };

  declare export class PushNotificationChannel {
    +expirationTime: Date;
    +uri: Object;

    close(): void;
  }

  declare export class PushNotificationCreateChannelResult {
    +channel: PushNotificationChannel;
    +extendedError: number;
    +status: $Values<PushNotificationChannelStatus>;
  }

  declare export class PushNotificationManager {
    static +default: PushNotificationManager;

    static isSupported(): boolean;

    createChannelAsync(
      remoteId: string,
      callback: (
        error: Error,
        result: PushNotificationCreateChannelResult,
      ) => void,
    ): void;

    register(): void;

    unregister(): void;

    unregisterAll(): void;

    addListener(
      type: 'PushReceived',
      listener: (
        manager: PushNotificationManager,
        args: PushNotificationReceivedEventArgs,
      ) => void,
    ): void;
    removeListener(
      type: 'PushReceived',
      listener: (
        manager: PushNotificationManager,
        args: PushNotificationReceivedEventArgs,
      ) => void,
    ): void;
    on(
      type: 'PushReceived',
      listener: (
        manager: PushNotificationManager,
        args: PushNotificationReceivedEventArgs,
      ) => void,
    ): void;
    off(
      type: 'PushReceived',
      listener: (
        manager: PushNotificationManager,
        args: PushNotificationReceivedEventArgs,
      ) => void,
    ): void;
  }

  declare export class PushNotificationReceivedEventArgs {
    +payload: Object;

    getDeferral(): Object;

    addListener(
      type: 'Canceled',
      listener: (sender: any, reason: any) => void,
    ): void;
    removeListener(
      type: 'Canceled',
      listener: (sender: any, reason: any) => void,
    ): void;
    on(type: 'Canceled', listener: (sender: any, reason: any) => void): void;
    off(type: 'Canceled', listener: (sender: any, reason: any) => void): void;
  }
}
