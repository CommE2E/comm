#include "BackupServiceImpl.h"

#include "AuthenticationManager.h"
#include "ServerBidiReactorBase.h"
#include "ServerReadReactorBase.h"

#include <aws/core/Aws.h>

namespace comm {
namespace network {

BackupServiceImpl::BackupServiceImpl() {
  Aws::InitAPI({});
}

BackupServiceImpl::~BackupServiceImpl() {
  Aws::ShutdownAPI({});
}

grpc::ServerBidiReactor<
    backup::CreateNewBackupRequest,
    backup::CreateNewBackupResponse> *
BackupServiceImpl::CreateNewBackup(grpc::CallbackServerContext *context) {
  class CreateNewBackupReactor : public ServerBidiReactorBase<
                                     backup::CreateNewBackupRequest,
                                     backup::CreateNewBackupResponse> {
    auth::AuthenticationManager authenticationManager;

  public:
    std::unique_ptr<grpc::Status> handleRequest(
        backup::CreateNewBackupRequest request,
        backup::CreateNewBackupResponse *response) override {
      if (this->authenticationManager.getState() !=
              auth::AuthenticationState::SUCCESS &&
          !request.has_authenticationrequestdata()) {
        return std::make_unique<grpc::Status>(
            grpc::StatusCode::INTERNAL,
            "authentication has not been finished properly");
      }
      if (this->authenticationManager.getState() ==
          auth::AuthenticationState::FAIL) {
        return std::make_unique<grpc::Status>(
            grpc::StatusCode::INTERNAL, "authentication failure");
      }
      if (this->authenticationManager.getState() !=
          auth::AuthenticationState::SUCCESS) {
        backup::FullAuthenticationResponseData *authResponse =
            this->authenticationManager.processRequest(
                request.authenticationrequestdata());
        response->set_allocated_authenticationresponsedata(authResponse);
        return nullptr;
      }
      // for now we're skipping authentication
      if (!request.has_newcompactionchunk()) {
        return nullptr;
      }
      std::cout << "processing data chunk" << std::endl;
      // TODO handle request
      return std::make_unique<grpc::Status>(
          grpc::StatusCode::UNIMPLEMENTED, "unimplemented");
    }
  };

  return new CreateNewBackupReactor();
}

grpc::ServerReadReactor<backup::SendLogRequest> *BackupServiceImpl::SendLog(
    grpc::CallbackServerContext *context,
    google::protobuf::Empty *response) {
  class SendLogReactor : public ServerReadReactorBase<
                             backup::SendLogRequest,
                             google::protobuf::Empty> {
  public:
    using ServerReadReactorBase<
        backup::SendLogRequest,
        google::protobuf::Empty>::ServerReadReactorBase;
    std::unique_ptr<grpc::Status>
    readRequest(backup::SendLogRequest request) override {
      // TODO handle request
      return std::make_unique<grpc::Status>(
          grpc::StatusCode::UNIMPLEMENTED, "unimplemented");
    }
  };

  return new SendLogReactor(response);
}

grpc::ServerBidiReactor<
    backup::RecoverBackupKeyRequest,
    backup::RecoverBackupKeyResponse> *
BackupServiceImpl::RecoverBackupKey(grpc::CallbackServerContext *context) {
  class RecoverBackupKeyReactor : public ServerBidiReactorBase<
                                      backup::RecoverBackupKeyRequest,
                                      backup::RecoverBackupKeyResponse> {
  public:
    std::unique_ptr<grpc::Status> handleRequest(
        backup::RecoverBackupKeyRequest request,
        backup::RecoverBackupKeyResponse *response) override {
      // TODO handle request
      return std::make_unique<grpc::Status>(
          grpc::StatusCode::UNIMPLEMENTED, "unimplemented");
    }
  };

  return new RecoverBackupKeyReactor();
}

grpc::ServerBidiReactor<backup::PullBackupRequest, backup::PullBackupResponse> *
BackupServiceImpl::PullBackup(grpc::CallbackServerContext *context) {
  class PullBackupReactor : public ServerBidiReactorBase<
                                backup::PullBackupRequest,
                                backup::PullBackupResponse> {
  public:
    std::unique_ptr<grpc::Status> handleRequest(
        backup::PullBackupRequest request,
        backup::PullBackupResponse *response) override {
      // TODO handle request
      return std::make_unique<grpc::Status>(
          grpc::StatusCode::UNIMPLEMENTED, "unimplemented");
    }
  };

  return new PullBackupReactor();
}

} // namespace network
} // namespace comm
