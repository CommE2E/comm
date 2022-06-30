#include "BackupServiceImpl.h"

#include "AddAttachmentsUtility.h"
#include "CreateNewBackupReactor.h"
#include "PullBackupReactor.h"
#include "RecoverBackupKeyReactor.h"
#include "SendLogReactor.h"

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
  return new reactor::CreateNewBackupReactor();
}

grpc::ServerReadReactor<backup::SendLogRequest> *BackupServiceImpl::SendLog(
    grpc::CallbackServerContext *context,
    backup::SendLogResponse *response) {
  return new reactor::SendLogReactor(response);
}

grpc::ServerBidiReactor<
    backup::RecoverBackupKeyRequest,
    backup::RecoverBackupKeyResponse> *
BackupServiceImpl::RecoverBackupKey(grpc::CallbackServerContext *context) {
  return new reactor::RecoverBackupKeyReactor();
}

grpc::ServerWriteReactor<backup::PullBackupResponse> *
BackupServiceImpl::PullBackup(
    grpc::CallbackServerContext *context,
    const backup::PullBackupRequest *request) {
  reactor::PullBackupReactor *reactor = new reactor::PullBackupReactor(request);
  reactor->start();
  return reactor;
}

grpc::ServerUnaryReactor *BackupServiceImpl::AddAttachments(
    grpc::CallbackServerContext *context,
    const backup::AddAttachmentsRequest *request,
    google::protobuf::Empty *response) {
  grpc::Status status =
      reactor::AddAttachmentsUtility().processRequest(request);
  auto *reactor = context->DefaultReactor();
  reactor->Finish(status);
  return reactor;
}

} // namespace network
} // namespace comm
