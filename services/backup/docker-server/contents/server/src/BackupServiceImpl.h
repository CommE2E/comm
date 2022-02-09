#pragma once

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {

class BackupServiceImpl final : public backup::BackupService::Service {

public:
  BackupServiceImpl();
  virtual ~BackupServiceImpl();
  /*
    grpc::Status CreateNewBackup(
        grpc::ServerContext *context,
        grpc::ServerReader<backup::CreateNewBackupRequest> *reader,
        google::protobuf::Empty *response) override;
    grpc::Status SendLog(
        grpc::ServerContext *context,
        grpc::ServerReader<backup::SendLogRequest> *reader,
        google::protobuf::Empty *response) override;
    grpc::Status PullBackupKey(
        grpc::ServerContext *context,
        grpc::ServerReaderWriter<
            backup::PullBackupKeyResponse,
            backup::PullBackupKeyRequest> *stream) override;
    grpc::Status PullCompaction(
        grpc::ServerContext *context,
        grpc::ServerReaderWriter<
            backup::PullCompactionResponse,
            backup::PullCompactionRequest> *stream) override;
  */
};

} // namespace network
} // namespace comm
