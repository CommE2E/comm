#include "BackupServiceImpl.h"

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
    google::protobuf::Empty *response) {
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
  reactor->NextWrite();
  return reactor;
}

} // namespace network
} // namespace comm
