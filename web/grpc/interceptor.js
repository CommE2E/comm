// @flow

import * as grpcWeb from 'grpc-web';

import type { PlatformDetails } from 'lib/types/device-types.js';

class VersionInterceptor<Request, Response> {
  platformDetails: PlatformDetails;

  constructor(platformDetails: PlatformDetails) {
    this.platformDetails = platformDetails;
  }

  intercept(
    request: grpcWeb.Request<Request, Response>,
    invoker: (
      request: grpcWeb.Request<Request, Response>,
    ) => Promise<grpcWeb.UnaryResponse<Request, Response>>,
  ): Promise<grpcWeb.UnaryResponse<Request, Response>> {
    const metadata = request.getMetadata();
    const {
      codeVersion,
      stateVersion,
      majorDesktopVersion,
      platform: deviceType,
    } = this.platformDetails;
    if (codeVersion) {
      metadata['code_version'] = codeVersion.toString();
    }
    if (stateVersion) {
      metadata['state_version'] = stateVersion.toString();
    }
    if (majorDesktopVersion) {
      metadata['major_desktop_version'] = majorDesktopVersion.toString();
    }

    let identityDeviceType;
    if (deviceType === 'macos') {
      identityDeviceType = 'mac_os';
    } else {
      identityDeviceType = deviceType;
    }
    metadata['device_type'] = identityDeviceType;

    return invoker(request);
  }
}

class AuthInterceptor<Request, Response> {
  userID: string;
  deviceID: string;
  accessToken: string;

  constructor(userID: string, deviceID: string, accessToken: string) {
    this.userID = userID;
    this.deviceID = deviceID;
    this.accessToken = accessToken;
  }

  intercept(
    request: grpcWeb.Request<Request, Response>,
    invoker: (
      request: grpcWeb.Request<Request, Response>,
    ) => Promise<grpcWeb.UnaryResponse<Request, Response>>,
  ): Promise<grpcWeb.UnaryResponse<Request, Response>> {
    const metadata = request.getMetadata();
    metadata['user_id'] = this.userID;
    metadata['device_id'] = this.deviceID;
    metadata['access_token'] = this.accessToken;

    return invoker(request);
  }
}

export { VersionInterceptor, AuthInterceptor };
