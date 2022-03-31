#include "BackupServiceImpl.h"

#include "ReadReactorBase.h"
#include "ServerBidiReactorBase.h"

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
  class CreateNewBackupReactor : public reactor::ServerBidiReactorBase<
                                     backup::CreateNewBackupRequest,
                                     backup::CreateNewBackupResponse> {
  public:
    std::unique_ptr<reactor::ServerBidiReactorStatus> handleRequest(
        backup::CreateNewBackupRequest request,
        backup::CreateNewBackupResponse *response) override {
      // TODO handle request
      return std::make_unique<reactor::ServerBidiReactorStatus>(
          grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "unimplemented"));
    }
  };

  return new CreateNewBackupReactor();
}

grpc::ServerReadReactor<backup::SendLogRequest> *BackupServiceImpl::SendLog(
    grpc::CallbackServerContext *context,
    google::protobuf::Empty *response) {
  class SendLogReactor : public ReadReactorBase<
                             backup::SendLogRequest,
                             google::protobuf::Empty> {
  public:
    using ReadReactorBase<backup::SendLogRequest, google::protobuf::Empty>::
        ReadReactorBase;
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
  class RecoverBackupKeyReactor : public reactor::ServerBidiReactorBase<
                                      backup::RecoverBackupKeyRequest,
                                      backup::RecoverBackupKeyResponse> {
  public:
    std::unique_ptr<reactor::ServerBidiReactorStatus> handleRequest(
        backup::RecoverBackupKeyRequest request,
        backup::RecoverBackupKeyResponse *response) override {
      // TODO handle request
      return std::make_unique<reactor::ServerBidiReactorStatus>(
          grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "unimplemented"));
    }
  };

  return new RecoverBackupKeyReactor();
}

grpc::ServerBidiReactor<backup::PullBackupRequest, backup::PullBackupResponse> *
BackupServiceImpl::PullBackup(grpc::CallbackServerContext *context) {
  class PullBackupReactor : public reactor::ServerBidiReactorBase<
                                backup::PullBackupRequest,
                                backup::PullBackupResponse> {
  public:
    std::unique_ptr<reactor::ServerBidiReactorStatus> handleRequest(
        backup::PullBackupRequest request,
        backup::PullBackupResponse *response) override {
      // TODO handle request
      return std::make_unique<reactor::ServerBidiReactorStatus>(
          grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "unimplemented"));
    }
  };

  return new PullBackupReactor();
}

} // namespace network
} // namespace comm
