#pragma once

#include <memory>
#include <string>

#include <grpcpp/grpcpp.h>

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <string>
#include <unordered_map>
#include <vector>

namespace comm {
namespace network {

class BackupServiceImpl final : public backup::BackupService::Service {
  // TODO: replace this with the database
  // this isn't even thread-safe, but I just wanted to simulate some data
  // storage so I can write up and test a draft for basic functionalities
  // BEGIN
  std::unordered_map<std::string, std::string> backupKeys;
  std::unordered_map<std::string, std::string> logs;
  std::unordered_map<std::string, std::string> compacts;
  // END
public:
  grpc::Status ResetKey(grpc::ServerContext *context,
                        grpc::ServerReader<backup::ResetKeyRequest> *reader,
                        backup::ResetKeyResponse *response) override;
  grpc::Status SendLog(grpc::ServerContext *context,
                       const backup::SendLogRequest *request,
                       backup::SendLogResponse *response) override;
  grpc::Status PullBackupKey(grpc::ServerContext *context,
                             const backup::PullBackupKeyRequest *request,
                             backup::PullBackupKeyResponse *response) override;
  grpc::Status PullCompaction(
      grpc::ServerContext *context,
      const backup::PullCompactionRequest *request,
      grpc::ServerWriter<backup::PullCompactionResponse> *writer) override;
};

} // namespace network
} // namespace comm
