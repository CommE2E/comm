#include "BackupServiceImpl.h"

#include <iostream>

namespace comm {
namespace network {

std::string
BackupServiceImpl::generateObjectName(const std::string &userId,
                                      const OBJECT_TYPE objectType) const {
  if (objectType == OBJECT_TYPE::ENCRYPTED_BACKUP_KEY) {
    return userId + "-backup-key";
  }
  if (objectType == OBJECT_TYPE::TRANSACTION_LOGS) {
    return userId + "-logs";
  }
  if (objectType == OBJECT_TYPE::COMPACTION) {
    return userId + "-compaction";
  }
  throw std::runtime_error("unhandled operation");
}

BackupServiceImpl::BackupServiceImpl() {
  Aws::InitAPI({});
  this->storageManager = std::make_unique<AwsStorageManager>();
  if (!this->storageManager->getBucket(this->bucketName).isAvailable()) {
    throw std::runtime_error("bucket " + this->bucketName + " not available");
  }
}

BackupServiceImpl::~BackupServiceImpl() { Aws::ShutdownAPI({}); }

grpc::Status
BackupServiceImpl::ResetKey(grpc::ServerContext *context,
                            grpc::ServerReader<backup::ResetKeyRequest> *reader,
                            google::protobuf::Empty *response) {
  backup::ResetKeyRequest request;
  std::string id;
  AwsS3Bucket bucket = this->storageManager->getBucket(this->bucketName);
  while (reader->Read(&request)) {
    if (!id.size()) {
      id = request.userid();
    } else if (id != request.userid()) {
      throw std::runtime_error("id mismatch: " + id + "/" + request.userid());
    }
    const std::string newKey = request.newkey();
    const std::string compactionChunk = request.compactionchunk();
    // the following behavior assumes that the client sends:
    // 1. key + empty chunk
    // 2. empty key + chunk
    // ...
    // N. empty key + chunk
    if (newKey.size()) {
      std::cout << "Backup Service => ResetKey(this log will be removed) "
                   "reading key ["
                << newKey << "]" << std::endl;
      bucket.writeObject(
          this->generateObjectName(id, OBJECT_TYPE::ENCRYPTED_BACKUP_KEY),
          newKey);
      bucket.clearObject(this->generateObjectName(id, OBJECT_TYPE::COMPACTION));
    } else if (compactionChunk.size()) {
      std::cout << "Backup Service => ResetKey(this log will be removed) "
                   "reading chunk ["
                << compactionChunk << "]" << std::endl;
      bucket.appendToObject(
          this->generateObjectName(id, OBJECT_TYPE::COMPACTION),
          compactionChunk);
    }
  }
  bucket.clearObject(
      this->generateObjectName(id, OBJECT_TYPE::TRANSACTION_LOGS));

  return grpc::Status::OK;
}

grpc::Status BackupServiceImpl::SendLog(grpc::ServerContext *context,
                                        const backup::SendLogRequest *request,
                                        google::protobuf::Empty *response) {
  const std::string id = request->userid();
  const std::string data = request->data();

  std::cout << "Backup Service => SendLog, id:[" << id << "] data: [" << data
            << "](this log will be removed)" << std::endl;
  this->storageManager->getBucket(this->bucketName)
      .appendToObject(
          this->generateObjectName(id, OBJECT_TYPE::TRANSACTION_LOGS), data);

  return grpc::Status::OK;
}

grpc::Status
BackupServiceImpl::PullBackupKey(grpc::ServerContext *context,
                                 const backup::PullBackupKeyRequest *request,
                                 backup::PullBackupKeyResponse *response) {
  const std::string id = request->userid();
  const std::string pakeKey = request->pakekey();

  std::cout << "Backup Service => PullBackupKey, id:[" << id << "] pakeKey: ["
            << pakeKey << "](this log will be removed)" << std::endl;

  // TODO pake operations - verify user's password with pake's keys
  std::string key = this->storageManager->getBucket(this->bucketName)
                        .getObjectData(this->generateObjectName(
                            id, OBJECT_TYPE::ENCRYPTED_BACKUP_KEY));
  response->set_encryptedbackupkey(key);

  return grpc::Status::OK;
}

grpc::Status BackupServiceImpl::PullCompaction(
    grpc::ServerContext *context, const backup::PullCompactionRequest *request,
    grpc::ServerWriter<backup::PullCompactionResponse> *writer) {
  const std::string id = request->userid();

  std::cout << "Backup Service => PullCompaction, id:[" << id
            << "](this log will be removed)" << std::endl;

  AwsS3Bucket bucket = this->storageManager->getBucket(this->bucketName);
  {
    backup::PullCompactionResponse response;
    std::function<void(const std::string &)> callback =
        [&response, &writer](std::string chunk) {
          response.set_compactionchunk(chunk);
          if (!writer->Write(response)) {
            throw std::runtime_error("writer interrupted sending compaction");
          }
        };

    bucket.getObjectDataChunks(
        this->generateObjectName(id, OBJECT_TYPE::COMPACTION), callback,
        GRPC_CHUNK_SIZE_LIMIT);
  }
  {
    backup::PullCompactionResponse response;
    std::function<void(const std::string &)> callback =
        [&response, &writer](std::string chunk) {
          response.set_logchunk(chunk);
          if (!writer->Write(response)) {
            throw std::runtime_error("writer interrupted sending logs");
          }
        };

    bucket.getObjectDataChunks(
        this->generateObjectName(id, OBJECT_TYPE::TRANSACTION_LOGS), callback,
        GRPC_CHUNK_SIZE_LIMIT);
  }
  return grpc::Status::OK;
}

} // namespace network
} // namespace comm
