#pragma once

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <grpcpp/grpcpp.h>

namespace comm {
namespace network {

class BackupServiceImpl final : public backup::BackupService::CallbackService {

public:
  BackupServiceImpl();
  virtual ~BackupServiceImpl();

  grpc::ServerBidiReactor<
      backup::CreateNewBackupRequest,
      backup::CreateNewBackupResponse> *
  CreateNewBackup(grpc::CallbackServerContext *context) override;

  grpc::ServerReadReactor<backup::SendLogRequest> *SendLog(
      grpc::CallbackServerContext *context,
      google::protobuf::Empty *response) override;

  grpc::ServerBidiReactor<
      backup::RecoverBackupKeyRequest,
      backup::RecoverBackupKeyResponse> *
  RecoverBackupKey(grpc::CallbackServerContext *context) override;

  grpc::ServerBidiReactor<backup::PullBackupRequest, backup::PullBackupResponse>
      *PullBackup(grpc::CallbackServerContext *context) override;
};

} // namespace network
} // namespace comm
