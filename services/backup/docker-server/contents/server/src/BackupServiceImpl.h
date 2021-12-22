#pragma once

#include "AwsStorageManager.h"
#include "Tools.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <aws/core/Aws.h>

#include <grpcpp/grpcpp.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace comm {
namespace network {

class BackupServiceImpl final : public backup::BackupService::Service {
  const std::string bucketName = "commapp-backup";

  std::unique_ptr<AwsStorageManager> storageManager;

  std::string generateObjectName(
      const std::string &userId,
      const OBJECT_TYPE objectType) const;

public:
  BackupServiceImpl();
  virtual ~BackupServiceImpl();

  grpc::Status ResetKey(
      grpc::ServerContext *context,
      grpc::ServerReader<backup::ResetKeyRequest> *reader,
      google::protobuf::Empty *response) override;
  grpc::Status SendLog(
      grpc::ServerContext *context,
      const backup::SendLogRequest *request,
      google::protobuf::Empty *response) override;
  grpc::Status PullBackupKey(
      grpc::ServerContext *context,
      const backup::PullBackupKeyRequest *request,
      backup::PullBackupKeyResponse *response) override;
  grpc::Status PullCompaction(
      grpc::ServerContext *context,
      const backup::PullCompactionRequest *request,
      grpc::ServerWriter<backup::PullCompactionResponse> *writer) override;
};

} // namespace network
} // namespace comm
