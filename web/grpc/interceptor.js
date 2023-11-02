// @flow

import * as grpcWeb from 'grpc-web';

import { getConfig } from 'lib/utils/config.js';

class VersionInterceptor<Request, Response> {
  intercept(
    request: grpcWeb.Request<Request, Response>,
    invoker: (
      request: grpcWeb.Request<Request, Response>,
    ) => Promise<grpcWeb.UnaryResponse<Request, Response>>,
  ): Promise<grpcWeb.UnaryResponse<Request, Response>> {
    const metadata = request.getMetadata();
    const config = getConfig();
    const codeVersion = config.platformDetails.codeVersion;
    const deviceType = config.platformDetails.platform;
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
