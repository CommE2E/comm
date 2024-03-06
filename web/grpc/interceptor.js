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
    const codeVersion = this.platformDetails.codeVersion;
    const deviceType = this.platformDetails.platform;
    if (codeVersion) {
      metadata['code_version'] = codeVersion.toString();
    }
    metadata['device_type'] = deviceType;

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
