#include "BackupServiceImpl.h"

#include <algorithm>

namespace comm {
namespace network {

grpc::Status
BackupServiceImpl::ResetKey(grpc::ServerContext *context,
                            grpc::ServerReader<backup::ResetKeyRequest> *reader,
                            backup::ResetKeyResponse *response) {
  // TODO implement this functionality properly
  backup::ResetKeyRequest request;
  while (reader->Read(&request)) {
    const std::string id = request.userid();
    const std::string newKey = request.newkey();
    const std::string compactionChunk = request.compactionchunk();

    // this will insert a new element only if it does not exist
    this->backupKeys.emplace(std::make_pair(id, ""));
    this->compacts.emplace(std::make_pair(id, ""));

    // the following behavior assumes that the client sends:
    // 1. key + empty chunk
    // 2. empty key + chunk
    // ...
    // N. empty key + chunk
    if (newKey.size()) {
      std::cout << "Backup Service => ResetKey(this log will be removed) "
                   "reading key ["
                << newKey << "]" << std::endl;
      this->backupKeys[id] = newKey;
      this->compacts[id] = "";
    } else if (compactionChunk.size()) {
      std::cout << "Backup Service => ResetKey(this log will be removed) "
                   "reading chunk ["
                << compactionChunk << "]" << std::endl;
      this->compacts[id] += compactionChunk;
    }
  }
  this->logs.clear();

  response->set_success(true);

  return grpc::Status::OK;
}

grpc::Status BackupServiceImpl::SendLog(grpc::ServerContext *context,
                                        const backup::SendLogRequest *request,
                                        backup::SendLogResponse *response) {
  // TODO implement this functionality properly
  const std::string id = request->userid();
  const std::string data = request->data();

  std::cout << "Backup Service => SendLog, id:[" << id << "] data: [" << data
            << "](this log will be removed)" << std::endl;
  // this will insert a new element only if it does not exist
  this->logs.emplace(std::make_pair(id, ""));
  this->logs[id] += data;

  return grpc::Status::OK;
}

grpc::Status
BackupServiceImpl::PullBackupKey(grpc::ServerContext *context,
                                 const backup::PullBackupKeyRequest *request,
                                 backup::PullBackupKeyResponse *response) {
  // TODO implement this functionality properly
  const std::string id = request->userid();
  const std::string pakeKey = request->pakekey();

  std::cout << "Backup Service => PullBackupKey, id:[" << id << "] pakeKey: ["
            << pakeKey << "](this log will be removed)" << std::endl;

  // TODO pake operations - verify user's password with pake's keys

  auto it = this->backupKeys.find(id);
  if (it == this->backupKeys.end()) {
    response->set_success(false);
    return grpc::Status::OK;
  }
  response->set_success(true);
  response->set_encryptedbackupkey(it->second);

  return grpc::Status::OK;
}

grpc::Status BackupServiceImpl::PullCompaction(
    grpc::ServerContext *context, const backup::PullCompactionRequest *request,
    grpc::ServerWriter<backup::PullCompactionResponse> *writer) {
  // TODO implement this functionality properly
  const std::string id = request->userid();

  std::cout << "Backup Service => PullCompaction, id:[" << id
            << "](this log will be removed)" << std::endl;

  size_t pos = 0;
  const size_t chunkSize = 10;
  // send compact
  while (pos < this->compacts[id].size()) {
    backup::PullCompactionResponse response;
    std::string chunk = this->compacts[id].substr(pos, chunkSize);
    response.set_compactionchunk(chunk);
    pos += chunkSize;
    if (!writer->Write(response)) {
      return grpc::Status::CANCELLED;
    }
  }
  // send logs
  pos = 0;
  while (pos < this->logs[id].size()) {
    backup::PullCompactionResponse response;
    std::string chunk = this->logs[id].substr(pos, chunkSize);
    response.set_logchunk(chunk);
    pos += chunkSize;
    if (!writer->Write(response)) {
      return grpc::Status::CANCELLED;
    }
  }

  return grpc::Status::OK;
}

} // namespace network
} // namespace comm
