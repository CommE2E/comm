/**
 * @fileoverview gRPC-Web generated client stub for identity.auth
 * @enhanceable
 * @public
 * @generated
 */

// Code generated by protoc-gen-grpc-web. DO NOT EDIT.
// versions:
// 	protoc-gen-grpc-web v1.4.2
// 	protoc              v3.21.12
// source: identity_auth.proto


/* eslint-disable */
// @ts-nocheck



const grpc = {};
grpc.web = require('grpc-web');


var identity_unauth_pb = require('./identity-unauth-structs.cjs')
const proto = {};
proto.identity = {};
proto.identity.auth = require('./identity-auth-structs.cjs');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?grpc.web.ClientOptions} options
 * @constructor
 * @struct
 * @final
 */
proto.identity.auth.IdentityClientServiceClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options.format = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname.replace(/\/+$/, '');

};


/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?grpc.web.ClientOptions} options
 * @constructor
 * @struct
 * @final
 */
proto.identity.auth.IdentityClientServicePromiseClient =
    function(hostname, credentials, options) {
  if (!options) options = {};
  options.format = 'text';

  /**
   * @private @const {!grpc.web.GrpcWebClientBase} The client
   */
  this.client_ = new grpc.web.GrpcWebClientBase(options);

  /**
   * @private @const {string} The hostname
   */
  this.hostname_ = hostname.replace(/\/+$/, '');

};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.auth.UploadOneTimeKeysRequest,
 *   !proto.identity.unauth.Empty>}
 */
const methodDescriptor_IdentityClientService_UploadOneTimeKeys = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/UploadOneTimeKeys',
  grpc.web.MethodType.UNARY,
  proto.identity.auth.UploadOneTimeKeysRequest,
  identity_unauth_pb.Empty,
  /**
   * @param {!proto.identity.auth.UploadOneTimeKeysRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  identity_unauth_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.identity.auth.UploadOneTimeKeysRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.unauth.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.unauth.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.uploadOneTimeKeys =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/UploadOneTimeKeys',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UploadOneTimeKeys,
      callback);
};


/**
 * @param {!proto.identity.auth.UploadOneTimeKeysRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.unauth.Empty>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.uploadOneTimeKeys =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/UploadOneTimeKeys',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UploadOneTimeKeys);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.auth.RefreshUserPrekeysRequest,
 *   !proto.identity.unauth.Empty>}
 */
const methodDescriptor_IdentityClientService_RefreshUserPrekeys = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/RefreshUserPrekeys',
  grpc.web.MethodType.UNARY,
  proto.identity.auth.RefreshUserPrekeysRequest,
  identity_unauth_pb.Empty,
  /**
   * @param {!proto.identity.auth.RefreshUserPrekeysRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  identity_unauth_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.identity.auth.RefreshUserPrekeysRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.unauth.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.unauth.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.refreshUserPrekeys =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/RefreshUserPrekeys',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_RefreshUserPrekeys,
      callback);
};


/**
 * @param {!proto.identity.auth.RefreshUserPrekeysRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.unauth.Empty>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.refreshUserPrekeys =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/RefreshUserPrekeys',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_RefreshUserPrekeys);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.auth.OutboundKeysForUserRequest,
 *   !proto.identity.auth.OutboundKeysForUserResponse>}
 */
const methodDescriptor_IdentityClientService_GetOutboundKeysForUser = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/GetOutboundKeysForUser',
  grpc.web.MethodType.UNARY,
  proto.identity.auth.OutboundKeysForUserRequest,
  proto.identity.auth.OutboundKeysForUserResponse,
  /**
   * @param {!proto.identity.auth.OutboundKeysForUserRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.auth.OutboundKeysForUserResponse.deserializeBinary
);


/**
 * @param {!proto.identity.auth.OutboundKeysForUserRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.auth.OutboundKeysForUserResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.auth.OutboundKeysForUserResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.getOutboundKeysForUser =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/GetOutboundKeysForUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetOutboundKeysForUser,
      callback);
};


/**
 * @param {!proto.identity.auth.OutboundKeysForUserRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.auth.OutboundKeysForUserResponse>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.getOutboundKeysForUser =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/GetOutboundKeysForUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetOutboundKeysForUser);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.auth.InboundKeysForUserRequest,
 *   !proto.identity.auth.InboundKeysForUserResponse>}
 */
const methodDescriptor_IdentityClientService_GetInboundKeysForUser = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/GetInboundKeysForUser',
  grpc.web.MethodType.UNARY,
  proto.identity.auth.InboundKeysForUserRequest,
  proto.identity.auth.InboundKeysForUserResponse,
  /**
   * @param {!proto.identity.auth.InboundKeysForUserRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.auth.InboundKeysForUserResponse.deserializeBinary
);


/**
 * @param {!proto.identity.auth.InboundKeysForUserRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.auth.InboundKeysForUserResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.auth.InboundKeysForUserResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.getInboundKeysForUser =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/GetInboundKeysForUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetInboundKeysForUser,
      callback);
};


/**
 * @param {!proto.identity.auth.InboundKeysForUserRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.auth.InboundKeysForUserResponse>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.getInboundKeysForUser =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/GetInboundKeysForUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetInboundKeysForUser);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.auth.OutboundKeysForUserRequest,
 *   !proto.identity.auth.KeyserverKeysResponse>}
 */
const methodDescriptor_IdentityClientService_GetKeyserverKeys = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/GetKeyserverKeys',
  grpc.web.MethodType.UNARY,
  proto.identity.auth.OutboundKeysForUserRequest,
  proto.identity.auth.KeyserverKeysResponse,
  /**
   * @param {!proto.identity.auth.OutboundKeysForUserRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.auth.KeyserverKeysResponse.deserializeBinary
);


/**
 * @param {!proto.identity.auth.OutboundKeysForUserRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.auth.KeyserverKeysResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.auth.KeyserverKeysResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.getKeyserverKeys =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/GetKeyserverKeys',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetKeyserverKeys,
      callback);
};


/**
 * @param {!proto.identity.auth.OutboundKeysForUserRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.auth.KeyserverKeysResponse>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.getKeyserverKeys =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/GetKeyserverKeys',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetKeyserverKeys);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.auth.UpdateUserPasswordStartRequest,
 *   !proto.identity.auth.UpdateUserPasswordStartResponse>}
 */
const methodDescriptor_IdentityClientService_UpdateUserPasswordStart = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/UpdateUserPasswordStart',
  grpc.web.MethodType.UNARY,
  proto.identity.auth.UpdateUserPasswordStartRequest,
  proto.identity.auth.UpdateUserPasswordStartResponse,
  /**
   * @param {!proto.identity.auth.UpdateUserPasswordStartRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.auth.UpdateUserPasswordStartResponse.deserializeBinary
);


/**
 * @param {!proto.identity.auth.UpdateUserPasswordStartRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.auth.UpdateUserPasswordStartResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.auth.UpdateUserPasswordStartResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.updateUserPasswordStart =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/UpdateUserPasswordStart',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UpdateUserPasswordStart,
      callback);
};


/**
 * @param {!proto.identity.auth.UpdateUserPasswordStartRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.auth.UpdateUserPasswordStartResponse>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.updateUserPasswordStart =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/UpdateUserPasswordStart',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UpdateUserPasswordStart);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.auth.UpdateUserPasswordFinishRequest,
 *   !proto.identity.unauth.Empty>}
 */
const methodDescriptor_IdentityClientService_UpdateUserPasswordFinish = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/UpdateUserPasswordFinish',
  grpc.web.MethodType.UNARY,
  proto.identity.auth.UpdateUserPasswordFinishRequest,
  identity_unauth_pb.Empty,
  /**
   * @param {!proto.identity.auth.UpdateUserPasswordFinishRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  identity_unauth_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.identity.auth.UpdateUserPasswordFinishRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.unauth.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.unauth.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.updateUserPasswordFinish =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/UpdateUserPasswordFinish',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UpdateUserPasswordFinish,
      callback);
};


/**
 * @param {!proto.identity.auth.UpdateUserPasswordFinishRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.unauth.Empty>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.updateUserPasswordFinish =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/UpdateUserPasswordFinish',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UpdateUserPasswordFinish);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.unauth.Empty,
 *   !proto.identity.unauth.Empty>}
 */
const methodDescriptor_IdentityClientService_LogOutUser = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/LogOutUser',
  grpc.web.MethodType.UNARY,
  identity_unauth_pb.Empty,
  identity_unauth_pb.Empty,
  /**
   * @param {!proto.identity.unauth.Empty} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  identity_unauth_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.identity.unauth.Empty} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.unauth.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.unauth.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.logOutUser =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/LogOutUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_LogOutUser,
      callback);
};


/**
 * @param {!proto.identity.unauth.Empty} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.unauth.Empty>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.logOutUser =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/LogOutUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_LogOutUser);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.unauth.Empty,
 *   !proto.identity.unauth.Empty>}
 */
const methodDescriptor_IdentityClientService_DeleteUser = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/DeleteUser',
  grpc.web.MethodType.UNARY,
  identity_unauth_pb.Empty,
  identity_unauth_pb.Empty,
  /**
   * @param {!proto.identity.unauth.Empty} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  identity_unauth_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.identity.unauth.Empty} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.unauth.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.unauth.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.deleteUser =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/DeleteUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_DeleteUser,
      callback);
};


/**
 * @param {!proto.identity.unauth.Empty} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.unauth.Empty>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.deleteUser =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/DeleteUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_DeleteUser);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.auth.GetDeviceListRequest,
 *   !proto.identity.auth.GetDeviceListResponse>}
 */
const methodDescriptor_IdentityClientService_GetDeviceListForUser = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/GetDeviceListForUser',
  grpc.web.MethodType.UNARY,
  proto.identity.auth.GetDeviceListRequest,
  proto.identity.auth.GetDeviceListResponse,
  /**
   * @param {!proto.identity.auth.GetDeviceListRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.auth.GetDeviceListResponse.deserializeBinary
);


/**
 * @param {!proto.identity.auth.GetDeviceListRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.auth.GetDeviceListResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.auth.GetDeviceListResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.getDeviceListForUser =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/GetDeviceListForUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetDeviceListForUser,
      callback);
};


/**
 * @param {!proto.identity.auth.GetDeviceListRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.auth.GetDeviceListResponse>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.getDeviceListForUser =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/GetDeviceListForUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetDeviceListForUser);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.auth.UpdateDeviceListRequest,
 *   !proto.identity.unauth.Empty>}
 */
const methodDescriptor_IdentityClientService_UpdateDeviceList = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/UpdateDeviceList',
  grpc.web.MethodType.UNARY,
  proto.identity.auth.UpdateDeviceListRequest,
  identity_unauth_pb.Empty,
  /**
   * @param {!proto.identity.auth.UpdateDeviceListRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  identity_unauth_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.identity.auth.UpdateDeviceListRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.unauth.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.unauth.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.updateDeviceList =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/UpdateDeviceList',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UpdateDeviceList,
      callback);
};


/**
 * @param {!proto.identity.auth.UpdateDeviceListRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.unauth.Empty>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.updateDeviceList =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/UpdateDeviceList',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UpdateDeviceList);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.auth.LinkFarcasterAccountRequest,
 *   !proto.identity.unauth.Empty>}
 */
const methodDescriptor_IdentityClientService_LinkFarcasterAccount = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/LinkFarcasterAccount',
  grpc.web.MethodType.UNARY,
  proto.identity.auth.LinkFarcasterAccountRequest,
  identity_unauth_pb.Empty,
  /**
   * @param {!proto.identity.auth.LinkFarcasterAccountRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  identity_unauth_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.identity.auth.LinkFarcasterAccountRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.unauth.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.unauth.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.linkFarcasterAccount =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/LinkFarcasterAccount',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_LinkFarcasterAccount,
      callback);
};


/**
 * @param {!proto.identity.auth.LinkFarcasterAccountRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.unauth.Empty>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.linkFarcasterAccount =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/LinkFarcasterAccount',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_LinkFarcasterAccount);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.unauth.Empty,
 *   !proto.identity.unauth.Empty>}
 */
const methodDescriptor_IdentityClientService_UnlinkFarcasterAccount = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/UnlinkFarcasterAccount',
  grpc.web.MethodType.UNARY,
  identity_unauth_pb.Empty,
  identity_unauth_pb.Empty,
  /**
   * @param {!proto.identity.unauth.Empty} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  identity_unauth_pb.Empty.deserializeBinary
);


/**
 * @param {!proto.identity.unauth.Empty} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.unauth.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.unauth.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.unlinkFarcasterAccount =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/UnlinkFarcasterAccount',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UnlinkFarcasterAccount,
      callback);
};


/**
 * @param {!proto.identity.unauth.Empty} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.unauth.Empty>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.unlinkFarcasterAccount =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/UnlinkFarcasterAccount',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UnlinkFarcasterAccount);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.auth.UserIdentityRequest,
 *   !proto.identity.auth.UserIdentityResponse>}
 */
const methodDescriptor_IdentityClientService_FindUserIdentity = new grpc.web.MethodDescriptor(
  '/identity.auth.IdentityClientService/FindUserIdentity',
  grpc.web.MethodType.UNARY,
  proto.identity.auth.UserIdentityRequest,
  proto.identity.auth.UserIdentityResponse,
  /**
   * @param {!proto.identity.auth.UserIdentityRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.auth.UserIdentityResponse.deserializeBinary
);


/**
 * @param {!proto.identity.auth.UserIdentityRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.auth.UserIdentityResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.auth.UserIdentityResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.auth.IdentityClientServiceClient.prototype.findUserIdentity =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.auth.IdentityClientService/FindUserIdentity',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_FindUserIdentity,
      callback);
};


/**
 * @param {!proto.identity.auth.UserIdentityRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.auth.UserIdentityResponse>}
 *     Promise that resolves to the response
 */
proto.identity.auth.IdentityClientServicePromiseClient.prototype.findUserIdentity =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.auth.IdentityClientService/FindUserIdentity',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_FindUserIdentity);
};


module.exports = proto.identity.auth;

