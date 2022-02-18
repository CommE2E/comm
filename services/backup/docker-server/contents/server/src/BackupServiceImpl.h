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

  grpc::Status CreateNewBackup(
      grpc::ServerContext *context,
      grpc::ServerReaderWriter<
          backup::CreateNewBackupResponse,
          backup::CreateNewBackupRequest> *stream) override;
  grpc::Status SendLog(
      grpc::ServerContext *context,
      grpc::ServerReader<backup::SendLogRequest> *reader,
      google::protobuf::Empty *response) override;
  grpc::Status RecoverBackupKey(
      grpc::ServerContext *context,
      grpc::ServerReaderWriter<
          backup::RecoverBackupKeyResponse,
          backup::RecoverBackupKeyRequest> *stream) override;
  grpc::Status PullBackup(
      grpc::ServerContext *context,
      grpc::ServerReaderWriter<
          backup::PullBackupResponse,
          backup::PullBackupRequest> *stream) override;
};

} // namespace network
} // namespace comm
