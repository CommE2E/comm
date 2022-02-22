#include "BackupServiceImpl.h"

#include <aws/core/Aws.h>

namespace comm {
namespace network {

BackupServiceImpl::BackupServiceImpl() {
  Aws::InitAPI({});
}

BackupServiceImpl::~BackupServiceImpl() {
  Aws::ShutdownAPI({});
}

grpc::Status BackupServiceImpl::CreateNewBackup(
    grpc::ServerContext *context,
    grpc::ServerReaderWriter<
        backup::CreateNewBackupResponse,
        backup::CreateNewBackupRequest> *stream) {
  return grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "not implemented yet");
}

grpc::Status BackupServiceImpl::SendLog(
    grpc::ServerContext *context,
    grpc::ServerReader<backup::SendLogRequest> *reader,
    google::protobuf::Empty *response) {
  return grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "not implemented yet");
}

grpc::Status BackupServiceImpl::RecoverBackupKey(
    grpc::ServerContext *context,
    grpc::ServerReaderWriter<
        backup::RecoverBackupKeyResponse,
        backup::RecoverBackupKeyRequest> *stream) {
  return grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "not implemented yet");
}

grpc::Status BackupServiceImpl::PullBackup(
    grpc::ServerContext *context,
    grpc::ServerReaderWriter<
        backup::PullBackupResponse,
        backup::PullBackupRequest> *stream) {
  return grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "not implemented yet");
}

} // namespace network
} // namespace comm
