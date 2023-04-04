/**
 * @fileoverview gRPC-Web generated client stub for identity.client
 * @enhanceable
 * @public
 * @generated
 */

// GENERATED CODE -- DO NOT EDIT!

/* eslint-disable */
// @ts-nocheck



const grpc = {};
grpc.web = require('grpc-web');

const proto = {};
proto.identity = {};
proto.identity.client = require('./identity-structs.cjs');

/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?grpc.web.ClientOptions} options
 * @constructor
 * @struct
 * @final
 */
proto.identity.client.IdentityClientServiceClient =
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
  this.hostname_ = hostname;

};


/**
 * @param {string} hostname
 * @param {?Object} credentials
 * @param {?grpc.web.ClientOptions} options
 * @constructor
 * @struct
 * @final
 */
proto.identity.client.IdentityClientServicePromiseClient =
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
  this.hostname_ = hostname;

};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.RegistrationStartRequest,
 *   !proto.identity.client.RegistrationStartResponse>}
 */
const methodDescriptor_IdentityClientService_RegisterPasswordUserStart = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/RegisterPasswordUserStart',
  grpc.web.MethodType.UNARY,
  proto.identity.client.RegistrationStartRequest,
  proto.identity.client.RegistrationStartResponse,
  /**
   * @param {!proto.identity.client.RegistrationStartRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.RegistrationStartResponse.deserializeBinary
);


/**
 * @param {!proto.identity.client.RegistrationStartRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.RegistrationStartResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.RegistrationStartResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.registerPasswordUserStart =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/RegisterPasswordUserStart',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_RegisterPasswordUserStart,
      callback);
};


/**
 * @param {!proto.identity.client.RegistrationStartRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.RegistrationStartResponse>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.registerPasswordUserStart =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/RegisterPasswordUserStart',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_RegisterPasswordUserStart);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.RegistrationFinishRequest,
 *   !proto.identity.client.RegistrationFinishResponse>}
 */
const methodDescriptor_IdentityClientService_RegisterPasswordUserFinish = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/RegisterPasswordUserFinish',
  grpc.web.MethodType.UNARY,
  proto.identity.client.RegistrationFinishRequest,
  proto.identity.client.RegistrationFinishResponse,
  /**
   * @param {!proto.identity.client.RegistrationFinishRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.RegistrationFinishResponse.deserializeBinary
);


/**
 * @param {!proto.identity.client.RegistrationFinishRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.RegistrationFinishResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.RegistrationFinishResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.registerPasswordUserFinish =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/RegisterPasswordUserFinish',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_RegisterPasswordUserFinish,
      callback);
};


/**
 * @param {!proto.identity.client.RegistrationFinishRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.RegistrationFinishResponse>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.registerPasswordUserFinish =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/RegisterPasswordUserFinish',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_RegisterPasswordUserFinish);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.UpdateUserPasswordStartRequest,
 *   !proto.identity.client.UpdateUserPasswordStartResponse>}
 */
const methodDescriptor_IdentityClientService_UpdateUserPasswordStart = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/UpdateUserPasswordStart',
  grpc.web.MethodType.UNARY,
  proto.identity.client.UpdateUserPasswordStartRequest,
  proto.identity.client.UpdateUserPasswordStartResponse,
  /**
   * @param {!proto.identity.client.UpdateUserPasswordStartRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.UpdateUserPasswordStartResponse.deserializeBinary
);


/**
 * @param {!proto.identity.client.UpdateUserPasswordStartRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.UpdateUserPasswordStartResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.UpdateUserPasswordStartResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.updateUserPasswordStart =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/UpdateUserPasswordStart',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UpdateUserPasswordStart,
      callback);
};


/**
 * @param {!proto.identity.client.UpdateUserPasswordStartRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.UpdateUserPasswordStartResponse>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.updateUserPasswordStart =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/UpdateUserPasswordStart',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UpdateUserPasswordStart);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.UpdateUserPasswordFinishRequest,
 *   !proto.identity.client.UpdateUserPasswordFinishResponse>}
 */
const methodDescriptor_IdentityClientService_UpdateUserPasswordFinish = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/UpdateUserPasswordFinish',
  grpc.web.MethodType.UNARY,
  proto.identity.client.UpdateUserPasswordFinishRequest,
  proto.identity.client.UpdateUserPasswordFinishResponse,
  /**
   * @param {!proto.identity.client.UpdateUserPasswordFinishRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.UpdateUserPasswordFinishResponse.deserializeBinary
);


/**
 * @param {!proto.identity.client.UpdateUserPasswordFinishRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.UpdateUserPasswordFinishResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.UpdateUserPasswordFinishResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.updateUserPasswordFinish =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/UpdateUserPasswordFinish',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UpdateUserPasswordFinish,
      callback);
};


/**
 * @param {!proto.identity.client.UpdateUserPasswordFinishRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.UpdateUserPasswordFinishResponse>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.updateUserPasswordFinish =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/UpdateUserPasswordFinish',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UpdateUserPasswordFinish);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.OpaqueLoginStartRequest,
 *   !proto.identity.client.OpaqueLoginStartResponse>}
 */
const methodDescriptor_IdentityClientService_LoginPasswordUserStart = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/LoginPasswordUserStart',
  grpc.web.MethodType.UNARY,
  proto.identity.client.OpaqueLoginStartRequest,
  proto.identity.client.OpaqueLoginStartResponse,
  /**
   * @param {!proto.identity.client.OpaqueLoginStartRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.OpaqueLoginStartResponse.deserializeBinary
);


/**
 * @param {!proto.identity.client.OpaqueLoginStartRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.OpaqueLoginStartResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.OpaqueLoginStartResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.loginPasswordUserStart =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/LoginPasswordUserStart',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_LoginPasswordUserStart,
      callback);
};


/**
 * @param {!proto.identity.client.OpaqueLoginStartRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.OpaqueLoginStartResponse>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.loginPasswordUserStart =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/LoginPasswordUserStart',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_LoginPasswordUserStart);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.OpaqueLoginFinishRequest,
 *   !proto.identity.client.OpaqueLoginFinishResponse>}
 */
const methodDescriptor_IdentityClientService_LoginPasswordUserFinish = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/LoginPasswordUserFinish',
  grpc.web.MethodType.UNARY,
  proto.identity.client.OpaqueLoginFinishRequest,
  proto.identity.client.OpaqueLoginFinishResponse,
  /**
   * @param {!proto.identity.client.OpaqueLoginFinishRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.OpaqueLoginFinishResponse.deserializeBinary
);


/**
 * @param {!proto.identity.client.OpaqueLoginFinishRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.OpaqueLoginFinishResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.OpaqueLoginFinishResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.loginPasswordUserFinish =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/LoginPasswordUserFinish',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_LoginPasswordUserFinish,
      callback);
};


/**
 * @param {!proto.identity.client.OpaqueLoginFinishRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.OpaqueLoginFinishResponse>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.loginPasswordUserFinish =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/LoginPasswordUserFinish',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_LoginPasswordUserFinish);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.WalletLoginRequest,
 *   !proto.identity.client.WalletLoginResponse>}
 */
const methodDescriptor_IdentityClientService_LoginWalletUser = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/LoginWalletUser',
  grpc.web.MethodType.UNARY,
  proto.identity.client.WalletLoginRequest,
  proto.identity.client.WalletLoginResponse,
  /**
   * @param {!proto.identity.client.WalletLoginRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.WalletLoginResponse.deserializeBinary
);


/**
 * @param {!proto.identity.client.WalletLoginRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.WalletLoginResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.WalletLoginResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.loginWalletUser =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/LoginWalletUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_LoginWalletUser,
      callback);
};


/**
 * @param {!proto.identity.client.WalletLoginRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.WalletLoginResponse>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.loginWalletUser =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/LoginWalletUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_LoginWalletUser);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.DeleteUserRequest,
 *   !proto.identity.client.Empty>}
 */
const methodDescriptor_IdentityClientService_DeleteUser = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/DeleteUser',
  grpc.web.MethodType.UNARY,
  proto.identity.client.DeleteUserRequest,
  proto.identity.client.Empty,
  /**
   * @param {!proto.identity.client.DeleteUserRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.Empty.deserializeBinary
);


/**
 * @param {!proto.identity.client.DeleteUserRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.deleteUser =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/DeleteUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_DeleteUser,
      callback);
};


/**
 * @param {!proto.identity.client.DeleteUserRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.Empty>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.deleteUser =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/DeleteUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_DeleteUser);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.Empty,
 *   !proto.identity.client.GenerateNonceResponse>}
 */
const methodDescriptor_IdentityClientService_GenerateNonce = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/GenerateNonce',
  grpc.web.MethodType.UNARY,
  proto.identity.client.Empty,
  proto.identity.client.GenerateNonceResponse,
  /**
   * @param {!proto.identity.client.Empty} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.GenerateNonceResponse.deserializeBinary
);


/**
 * @param {!proto.identity.client.Empty} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.GenerateNonceResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.GenerateNonceResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.generateNonce =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/GenerateNonce',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GenerateNonce,
      callback);
};


/**
 * @param {!proto.identity.client.Empty} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.GenerateNonceResponse>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.generateNonce =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/GenerateNonce',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GenerateNonce);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.ReceiverKeysForUserRequest,
 *   !proto.identity.client.ReceiverKeysForUserResponse>}
 */
const methodDescriptor_IdentityClientService_GetReceiverKeysForUser = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/GetReceiverKeysForUser',
  grpc.web.MethodType.UNARY,
  proto.identity.client.ReceiverKeysForUserRequest,
  proto.identity.client.ReceiverKeysForUserResponse,
  /**
   * @param {!proto.identity.client.ReceiverKeysForUserRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.ReceiverKeysForUserResponse.deserializeBinary
);


/**
 * @param {!proto.identity.client.ReceiverKeysForUserRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.ReceiverKeysForUserResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.ReceiverKeysForUserResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.getReceiverKeysForUser =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/GetReceiverKeysForUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetReceiverKeysForUser,
      callback);
};


/**
 * @param {!proto.identity.client.ReceiverKeysForUserRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.ReceiverKeysForUserResponse>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.getReceiverKeysForUser =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/GetReceiverKeysForUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetReceiverKeysForUser);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.SenderKeysForUserRequest,
 *   !proto.identity.client.SenderKeysForUserResponse>}
 */
const methodDescriptor_IdentityClientService_GetSenderKeysForUser = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/GetSenderKeysForUser',
  grpc.web.MethodType.UNARY,
  proto.identity.client.SenderKeysForUserRequest,
  proto.identity.client.SenderKeysForUserResponse,
  /**
   * @param {!proto.identity.client.SenderKeysForUserRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.SenderKeysForUserResponse.deserializeBinary
);


/**
 * @param {!proto.identity.client.SenderKeysForUserRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.SenderKeysForUserResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.SenderKeysForUserResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.getSenderKeysForUser =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/GetSenderKeysForUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetSenderKeysForUser,
      callback);
};


/**
 * @param {!proto.identity.client.SenderKeysForUserRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.SenderKeysForUserResponse>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.getSenderKeysForUser =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/GetSenderKeysForUser',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetSenderKeysForUser);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.KeyserverKeysRequest,
 *   !proto.identity.client.KeyserverKeysResponse>}
 */
const methodDescriptor_IdentityClientService_GetKeyserverKeys = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/GetKeyserverKeys',
  grpc.web.MethodType.UNARY,
  proto.identity.client.KeyserverKeysRequest,
  proto.identity.client.KeyserverKeysResponse,
  /**
   * @param {!proto.identity.client.KeyserverKeysRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.KeyserverKeysResponse.deserializeBinary
);


/**
 * @param {!proto.identity.client.KeyserverKeysRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.KeyserverKeysResponse)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.KeyserverKeysResponse>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.getKeyserverKeys =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/GetKeyserverKeys',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetKeyserverKeys,
      callback);
};


/**
 * @param {!proto.identity.client.KeyserverKeysRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.KeyserverKeysResponse>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.getKeyserverKeys =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/GetKeyserverKeys',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_GetKeyserverKeys);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.UploadOneTimeKeysRequest,
 *   !proto.identity.client.Empty>}
 */
const methodDescriptor_IdentityClientService_UploadOneTimeKeys = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/UploadOneTimeKeys',
  grpc.web.MethodType.UNARY,
  proto.identity.client.UploadOneTimeKeysRequest,
  proto.identity.client.Empty,
  /**
   * @param {!proto.identity.client.UploadOneTimeKeysRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.Empty.deserializeBinary
);


/**
 * @param {!proto.identity.client.UploadOneTimeKeysRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.uploadOneTimeKeys =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/UploadOneTimeKeys',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UploadOneTimeKeys,
      callback);
};


/**
 * @param {!proto.identity.client.UploadOneTimeKeysRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.Empty>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.uploadOneTimeKeys =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/UploadOneTimeKeys',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_UploadOneTimeKeys);
};


/**
 * @const
 * @type {!grpc.web.MethodDescriptor<
 *   !proto.identity.client.RefreshUserPreKeysRequest,
 *   !proto.identity.client.Empty>}
 */
const methodDescriptor_IdentityClientService_RefreshUserPreKeys = new grpc.web.MethodDescriptor(
  '/identity.client.IdentityClientService/RefreshUserPreKeys',
  grpc.web.MethodType.UNARY,
  proto.identity.client.RefreshUserPreKeysRequest,
  proto.identity.client.Empty,
  /**
   * @param {!proto.identity.client.RefreshUserPreKeysRequest} request
   * @return {!Uint8Array}
   */
  function(request) {
    return request.serializeBinary();
  },
  proto.identity.client.Empty.deserializeBinary
);


/**
 * @param {!proto.identity.client.RefreshUserPreKeysRequest} request The
 *     request proto
 * @param {?Object<string, string>} metadata User defined
 *     call metadata
 * @param {function(?grpc.web.RpcError, ?proto.identity.client.Empty)}
 *     callback The callback function(error, response)
 * @return {!grpc.web.ClientReadableStream<!proto.identity.client.Empty>|undefined}
 *     The XHR Node Readable Stream
 */
proto.identity.client.IdentityClientServiceClient.prototype.refreshUserPreKeys =
    function(request, metadata, callback) {
  return this.client_.rpcCall(this.hostname_ +
      '/identity.client.IdentityClientService/RefreshUserPreKeys',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_RefreshUserPreKeys,
      callback);
};


/**
 * @param {!proto.identity.client.RefreshUserPreKeysRequest} request The
 *     request proto
 * @param {?Object<string, string>=} metadata User defined
 *     call metadata
 * @return {!Promise<!proto.identity.client.Empty>}
 *     Promise that resolves to the response
 */
proto.identity.client.IdentityClientServicePromiseClient.prototype.refreshUserPreKeys =
    function(request, metadata) {
  return this.client_.unaryCall(this.hostname_ +
      '/identity.client.IdentityClientService/RefreshUserPreKeys',
      request,
      metadata || {},
      methodDescriptor_IdentityClientService_RefreshUserPreKeys);
};


module.exports = proto.identity.client;

