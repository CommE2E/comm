// @generated by the gRPC C++ plugin.
// If you make any local change, they will be lost.
// source: identity.proto

#include "identity.pb.h"
#include "identity.grpc.pb.h"

#include <functional>
#include <grpcpp/impl/codegen/async_stream.h>
#include <grpcpp/impl/codegen/async_unary_call.h>
#include <grpcpp/impl/codegen/channel_interface.h>
#include <grpcpp/impl/codegen/client_unary_call.h>
#include <grpcpp/impl/codegen/client_callback.h>
#include <grpcpp/impl/codegen/message_allocator.h>
#include <grpcpp/impl/codegen/method_handler.h>
#include <grpcpp/impl/codegen/rpc_service_method.h>
#include <grpcpp/impl/codegen/server_callback.h>
#include <grpcpp/impl/codegen/server_callback_handlers.h>
#include <grpcpp/impl/codegen/server_context.h>
#include <grpcpp/impl/codegen/service_type.h>
#include <grpcpp/impl/codegen/sync_stream.h>
namespace identity {

static const char* IdentityService_method_names[] = {
  "/identity.IdentityService/RegisterUser",
  "/identity.IdentityService/LoginUser",
  "/identity.IdentityService/VerifyUserToken",
  "/identity.IdentityService/GetUserID",
};

std::unique_ptr< IdentityService::Stub> IdentityService::NewStub(const std::shared_ptr< ::grpc::ChannelInterface>& channel, const ::grpc::StubOptions& options) {
  (void)options;
  std::unique_ptr< IdentityService::Stub> stub(new IdentityService::Stub(channel, options));
  return stub;
}

IdentityService::Stub::Stub(const std::shared_ptr< ::grpc::ChannelInterface>& channel, const ::grpc::StubOptions& options)
  : channel_(channel), rpcmethod_RegisterUser_(IdentityService_method_names[0], options.suffix_for_stats(),::grpc::internal::RpcMethod::BIDI_STREAMING, channel)
  , rpcmethod_LoginUser_(IdentityService_method_names[1], options.suffix_for_stats(),::grpc::internal::RpcMethod::BIDI_STREAMING, channel)
  , rpcmethod_VerifyUserToken_(IdentityService_method_names[2], options.suffix_for_stats(),::grpc::internal::RpcMethod::NORMAL_RPC, channel)
  , rpcmethod_GetUserID_(IdentityService_method_names[3], options.suffix_for_stats(),::grpc::internal::RpcMethod::NORMAL_RPC, channel)
  {}

::grpc::ClientReaderWriter< ::identity::RegistrationRequest, ::identity::RegistrationResponse>* IdentityService::Stub::RegisterUserRaw(::grpc::ClientContext* context) {
  return ::grpc::internal::ClientReaderWriterFactory< ::identity::RegistrationRequest, ::identity::RegistrationResponse>::Create(channel_.get(), rpcmethod_RegisterUser_, context);
}

void IdentityService::Stub::async::RegisterUser(::grpc::ClientContext* context, ::grpc::ClientBidiReactor< ::identity::RegistrationRequest,::identity::RegistrationResponse>* reactor) {
  ::grpc::internal::ClientCallbackReaderWriterFactory< ::identity::RegistrationRequest,::identity::RegistrationResponse>::Create(stub_->channel_.get(), stub_->rpcmethod_RegisterUser_, context, reactor);
}

::grpc::ClientAsyncReaderWriter< ::identity::RegistrationRequest, ::identity::RegistrationResponse>* IdentityService::Stub::AsyncRegisterUserRaw(::grpc::ClientContext* context, ::grpc::CompletionQueue* cq, void* tag) {
  return ::grpc::internal::ClientAsyncReaderWriterFactory< ::identity::RegistrationRequest, ::identity::RegistrationResponse>::Create(channel_.get(), cq, rpcmethod_RegisterUser_, context, true, tag);
}

::grpc::ClientAsyncReaderWriter< ::identity::RegistrationRequest, ::identity::RegistrationResponse>* IdentityService::Stub::PrepareAsyncRegisterUserRaw(::grpc::ClientContext* context, ::grpc::CompletionQueue* cq) {
  return ::grpc::internal::ClientAsyncReaderWriterFactory< ::identity::RegistrationRequest, ::identity::RegistrationResponse>::Create(channel_.get(), cq, rpcmethod_RegisterUser_, context, false, nullptr);
}

::grpc::ClientReaderWriter< ::identity::LoginRequest, ::identity::LoginResponse>* IdentityService::Stub::LoginUserRaw(::grpc::ClientContext* context) {
  return ::grpc::internal::ClientReaderWriterFactory< ::identity::LoginRequest, ::identity::LoginResponse>::Create(channel_.get(), rpcmethod_LoginUser_, context);
}

void IdentityService::Stub::async::LoginUser(::grpc::ClientContext* context, ::grpc::ClientBidiReactor< ::identity::LoginRequest,::identity::LoginResponse>* reactor) {
  ::grpc::internal::ClientCallbackReaderWriterFactory< ::identity::LoginRequest,::identity::LoginResponse>::Create(stub_->channel_.get(), stub_->rpcmethod_LoginUser_, context, reactor);
}

::grpc::ClientAsyncReaderWriter< ::identity::LoginRequest, ::identity::LoginResponse>* IdentityService::Stub::AsyncLoginUserRaw(::grpc::ClientContext* context, ::grpc::CompletionQueue* cq, void* tag) {
  return ::grpc::internal::ClientAsyncReaderWriterFactory< ::identity::LoginRequest, ::identity::LoginResponse>::Create(channel_.get(), cq, rpcmethod_LoginUser_, context, true, tag);
}

::grpc::ClientAsyncReaderWriter< ::identity::LoginRequest, ::identity::LoginResponse>* IdentityService::Stub::PrepareAsyncLoginUserRaw(::grpc::ClientContext* context, ::grpc::CompletionQueue* cq) {
  return ::grpc::internal::ClientAsyncReaderWriterFactory< ::identity::LoginRequest, ::identity::LoginResponse>::Create(channel_.get(), cq, rpcmethod_LoginUser_, context, false, nullptr);
}

::grpc::Status IdentityService::Stub::VerifyUserToken(::grpc::ClientContext* context, const ::identity::VerifyUserTokenRequest& request, ::identity::VerifyUserTokenResponse* response) {
  return ::grpc::internal::BlockingUnaryCall< ::identity::VerifyUserTokenRequest, ::identity::VerifyUserTokenResponse, ::grpc::protobuf::MessageLite, ::grpc::protobuf::MessageLite>(channel_.get(), rpcmethod_VerifyUserToken_, context, request, response);
}

void IdentityService::Stub::async::VerifyUserToken(::grpc::ClientContext* context, const ::identity::VerifyUserTokenRequest* request, ::identity::VerifyUserTokenResponse* response, std::function<void(::grpc::Status)> f) {
  ::grpc::internal::CallbackUnaryCall< ::identity::VerifyUserTokenRequest, ::identity::VerifyUserTokenResponse, ::grpc::protobuf::MessageLite, ::grpc::protobuf::MessageLite>(stub_->channel_.get(), stub_->rpcmethod_VerifyUserToken_, context, request, response, std::move(f));
}

void IdentityService::Stub::async::VerifyUserToken(::grpc::ClientContext* context, const ::identity::VerifyUserTokenRequest* request, ::identity::VerifyUserTokenResponse* response, ::grpc::ClientUnaryReactor* reactor) {
  ::grpc::internal::ClientCallbackUnaryFactory::Create< ::grpc::protobuf::MessageLite, ::grpc::protobuf::MessageLite>(stub_->channel_.get(), stub_->rpcmethod_VerifyUserToken_, context, request, response, reactor);
}

::grpc::ClientAsyncResponseReader< ::identity::VerifyUserTokenResponse>* IdentityService::Stub::PrepareAsyncVerifyUserTokenRaw(::grpc::ClientContext* context, const ::identity::VerifyUserTokenRequest& request, ::grpc::CompletionQueue* cq) {
  return ::grpc::internal::ClientAsyncResponseReaderHelper::Create< ::identity::VerifyUserTokenResponse, ::identity::VerifyUserTokenRequest, ::grpc::protobuf::MessageLite, ::grpc::protobuf::MessageLite>(channel_.get(), cq, rpcmethod_VerifyUserToken_, context, request);
}

::grpc::ClientAsyncResponseReader< ::identity::VerifyUserTokenResponse>* IdentityService::Stub::AsyncVerifyUserTokenRaw(::grpc::ClientContext* context, const ::identity::VerifyUserTokenRequest& request, ::grpc::CompletionQueue* cq) {
  auto* result =
    this->PrepareAsyncVerifyUserTokenRaw(context, request, cq);
  result->StartCall();
  return result;
}

::grpc::Status IdentityService::Stub::GetUserID(::grpc::ClientContext* context, const ::identity::GetUserIDRequest& request, ::identity::GetUserIDResponse* response) {
  return ::grpc::internal::BlockingUnaryCall< ::identity::GetUserIDRequest, ::identity::GetUserIDResponse, ::grpc::protobuf::MessageLite, ::grpc::protobuf::MessageLite>(channel_.get(), rpcmethod_GetUserID_, context, request, response);
}

void IdentityService::Stub::async::GetUserID(::grpc::ClientContext* context, const ::identity::GetUserIDRequest* request, ::identity::GetUserIDResponse* response, std::function<void(::grpc::Status)> f) {
  ::grpc::internal::CallbackUnaryCall< ::identity::GetUserIDRequest, ::identity::GetUserIDResponse, ::grpc::protobuf::MessageLite, ::grpc::protobuf::MessageLite>(stub_->channel_.get(), stub_->rpcmethod_GetUserID_, context, request, response, std::move(f));
}

void IdentityService::Stub::async::GetUserID(::grpc::ClientContext* context, const ::identity::GetUserIDRequest* request, ::identity::GetUserIDResponse* response, ::grpc::ClientUnaryReactor* reactor) {
  ::grpc::internal::ClientCallbackUnaryFactory::Create< ::grpc::protobuf::MessageLite, ::grpc::protobuf::MessageLite>(stub_->channel_.get(), stub_->rpcmethod_GetUserID_, context, request, response, reactor);
}

::grpc::ClientAsyncResponseReader< ::identity::GetUserIDResponse>* IdentityService::Stub::PrepareAsyncGetUserIDRaw(::grpc::ClientContext* context, const ::identity::GetUserIDRequest& request, ::grpc::CompletionQueue* cq) {
  return ::grpc::internal::ClientAsyncResponseReaderHelper::Create< ::identity::GetUserIDResponse, ::identity::GetUserIDRequest, ::grpc::protobuf::MessageLite, ::grpc::protobuf::MessageLite>(channel_.get(), cq, rpcmethod_GetUserID_, context, request);
}

::grpc::ClientAsyncResponseReader< ::identity::GetUserIDResponse>* IdentityService::Stub::AsyncGetUserIDRaw(::grpc::ClientContext* context, const ::identity::GetUserIDRequest& request, ::grpc::CompletionQueue* cq) {
  auto* result =
    this->PrepareAsyncGetUserIDRaw(context, request, cq);
  result->StartCall();
  return result;
}

IdentityService::Service::Service() {
  AddMethod(new ::grpc::internal::RpcServiceMethod(
      IdentityService_method_names[0],
      ::grpc::internal::RpcMethod::BIDI_STREAMING,
      new ::grpc::internal::BidiStreamingHandler< IdentityService::Service, ::identity::RegistrationRequest, ::identity::RegistrationResponse>(
          [](IdentityService::Service* service,
             ::grpc::ServerContext* ctx,
             ::grpc::ServerReaderWriter<::identity::RegistrationResponse,
             ::identity::RegistrationRequest>* stream) {
               return service->RegisterUser(ctx, stream);
             }, this)));
  AddMethod(new ::grpc::internal::RpcServiceMethod(
      IdentityService_method_names[1],
      ::grpc::internal::RpcMethod::BIDI_STREAMING,
      new ::grpc::internal::BidiStreamingHandler< IdentityService::Service, ::identity::LoginRequest, ::identity::LoginResponse>(
          [](IdentityService::Service* service,
             ::grpc::ServerContext* ctx,
             ::grpc::ServerReaderWriter<::identity::LoginResponse,
             ::identity::LoginRequest>* stream) {
               return service->LoginUser(ctx, stream);
             }, this)));
  AddMethod(new ::grpc::internal::RpcServiceMethod(
      IdentityService_method_names[2],
      ::grpc::internal::RpcMethod::NORMAL_RPC,
      new ::grpc::internal::RpcMethodHandler< IdentityService::Service, ::identity::VerifyUserTokenRequest, ::identity::VerifyUserTokenResponse, ::grpc::protobuf::MessageLite, ::grpc::protobuf::MessageLite>(
          [](IdentityService::Service* service,
             ::grpc::ServerContext* ctx,
             const ::identity::VerifyUserTokenRequest* req,
             ::identity::VerifyUserTokenResponse* resp) {
               return service->VerifyUserToken(ctx, req, resp);
             }, this)));
  AddMethod(new ::grpc::internal::RpcServiceMethod(
      IdentityService_method_names[3],
      ::grpc::internal::RpcMethod::NORMAL_RPC,
      new ::grpc::internal::RpcMethodHandler< IdentityService::Service, ::identity::GetUserIDRequest, ::identity::GetUserIDResponse, ::grpc::protobuf::MessageLite, ::grpc::protobuf::MessageLite>(
          [](IdentityService::Service* service,
             ::grpc::ServerContext* ctx,
             const ::identity::GetUserIDRequest* req,
             ::identity::GetUserIDResponse* resp) {
               return service->GetUserID(ctx, req, resp);
             }, this)));
}

IdentityService::Service::~Service() {
}

::grpc::Status IdentityService::Service::RegisterUser(::grpc::ServerContext* context, ::grpc::ServerReaderWriter< ::identity::RegistrationResponse, ::identity::RegistrationRequest>* stream) {
  (void) context;
  (void) stream;
  return ::grpc::Status(::grpc::StatusCode::UNIMPLEMENTED, "");
}

::grpc::Status IdentityService::Service::LoginUser(::grpc::ServerContext* context, ::grpc::ServerReaderWriter< ::identity::LoginResponse, ::identity::LoginRequest>* stream) {
  (void) context;
  (void) stream;
  return ::grpc::Status(::grpc::StatusCode::UNIMPLEMENTED, "");
}

::grpc::Status IdentityService::Service::VerifyUserToken(::grpc::ServerContext* context, const ::identity::VerifyUserTokenRequest* request, ::identity::VerifyUserTokenResponse* response) {
  (void) context;
  (void) request;
  (void) response;
  return ::grpc::Status(::grpc::StatusCode::UNIMPLEMENTED, "");
}

::grpc::Status IdentityService::Service::GetUserID(::grpc::ServerContext* context, const ::identity::GetUserIDRequest* request, ::identity::GetUserIDResponse* response) {
  (void) context;
  (void) request;
  (void) response;
  return ::grpc::Status(::grpc::StatusCode::UNIMPLEMENTED, "");
}


}  // namespace identity

