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
/*
grpc::Status BackupServiceImpl::CreateNewBackup(
    grpc::ServerContext *context,
    grpc::ServerReader<backup::CreateNewBackupRequest> *reader,
    google::protobuf::Empty *response) {
  return grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "not implemented yet");
}

grpc::Status BackupServiceImpl::SendLog(
    grpc::ServerContext *context,
    grpc::ServerReader<backup::SendLogRequest> *reader,
    google::protobuf::Empty *response) {
  return grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "not implemented yet");
}

grpc::Status BackupServiceImpl::PullBackupKey(
    grpc::ServerContext *context,
    grpc::ServerReaderWriter<
        backup::PullBackupKeyResponse,
        backup::PullBackupKeyRequest> *stream) {
  return grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "not implemented yet");
}

grpc::Status BackupServiceImpl::PullCompaction(
    grpc::ServerContext *context,
    grpc::ServerReaderWriter<
        backup::PullCompactionResponse,
        backup::PullCompactionRequest> *stream) {
  return grpc::Status(grpc::StatusCode::UNIMPLEMENTED, "not implemented yet");
}
*/
} // namespace network
} // namespace comm
