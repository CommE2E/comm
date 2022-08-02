#pragma once

// #include "ServiceBlobClient.h"

#include "../_generated/backup.grpc.pb.h"
#include "../_generated/backup.pb.h"

#include <grpcpp/grpcpp.h>

#include <memory>

namespace comm {
namespace network {

class BackupServiceImpl final : public backup::BackupService::CallbackService {
  //   std::shared_ptr<ServiceBlobClient> blobClient =
  //   std::make_shared<ServiceBlobClient>();

public:
  BackupServiceImpl();
  virtual ~BackupServiceImpl();

  grpc::ServerBidiReactor<
      backup::CreateNewBackupRequest,
      backup::CreateNewBackupResponse> *
  CreateNewBackup(grpc::CallbackServerContext *context) override;

  grpc::ServerReadReactor<backup::SendLogRequest> *SendLog(
      grpc::CallbackServerContext *context,
      backup::SendLogResponse *response) override;

  grpc::ServerBidiReactor<
      backup::RecoverBackupKeyRequest,
      backup::RecoverBackupKeyResponse> *
  RecoverBackupKey(grpc::CallbackServerContext *context) override;

  grpc::ServerWriteReactor<backup::PullBackupResponse> *PullBackup(
      grpc::CallbackServerContext *context,
      const backup::PullBackupRequest *request) override;

  grpc::ServerUnaryReactor *AddAttachments(
      grpc::CallbackServerContext *context,
      const backup::AddAttachmentsRequest *request,
      google::protobuf::Empty *response) override;
};

} // namespace network
} // namespace comm
