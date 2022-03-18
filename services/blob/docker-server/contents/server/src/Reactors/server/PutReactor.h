#pragma once

#include "ServerBidiReactorBase.h"

#include "../_generated/blob.grpc.pb.h"
#include "../_generated/blob.pb.h"

#include <iostream>
#include <memory>
#include <string>

namespace comm {
namespace network {
namespace reactor {

class PutReactor
    : public ServerBidiReactorBase<blob::PutRequest, blob::PutResponse> {
  std::string holder;
  std::string blobHash;
  std::string currentChunk;
  std::unique_ptr<database::S3Path> s3Path;
  std::shared_ptr<database::BlobItem> blobItem;
  std::unique_ptr<MultiPartUploader> uploader;

public:
  std::unique_ptr<grpc::Status> handleRequest(
      blob::PutRequest request,
      blob::PutResponse *response) override {
    if (this->holder.empty()) {
      if (request.holder().empty()) {
        throw std::runtime_error("holder has not been provided");
      }
      this->holder = request.holder();
      return nullptr;
    }
    if (this->blobHash.empty()) {
      if (request.blobhash().empty()) {
        throw std::runtime_error("blob hash has not been provided");
      }
      this->blobHash = request.blobhash();
      this->blobItem =
          database::DatabaseManager::getInstance().findBlobItem(this->blobHash);
      if (this->blobItem != nullptr) {
        this->s3Path =
            std::make_unique<database::S3Path>(this->blobItem->getS3Path());
        response->set_dataexists(true);
        std::cout << "data does exist" << std::endl;
        this->sendLastResponse = true;
        return std::make_unique<grpc::Status>(grpc::Status::OK);
      }
      this->s3Path = std::make_unique<database::S3Path>(
          generateS3Path(BLOB_BUCKET_NAME, this->blobHash));
      this->blobItem =
          std::make_shared<database::BlobItem>(this->blobHash, *s3Path);
      response->set_dataexists(false);
      std::cout << "data does not exist" << std::endl;
      return nullptr;
    }
    if (!request.datachunk().empty()) {
      if (this->uploader == nullptr) {
        std::cout << "initialize uploader" << std::endl;
        this->uploader = std::make_unique<MultiPartUploader>(
            getS3Client(), BLOB_BUCKET_NAME, s3Path->getObjectName());
      }
      std::cout << "adding chunk to current chunk" << std::endl;
      this->currentChunk += request.datachunk();
      if (this->currentChunk.size() > AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE) {
        std::cout << "adding chunk to uploader" << std::endl;
        this->uploader->addPart(this->currentChunk);
        this->currentChunk.clear();
      }
      return nullptr;
    }
    return std::make_unique<grpc::Status>(grpc::Status(
        grpc::StatusCode::INVALID_ARGUMENT, "data chunk expected"));
  }

  void doneCallback() override {
    std::cout << "done callback " << this->status.error_code() << "/"
              << this->status.error_message() << std::endl;
    if (this->status.error_code()) {
      if (this->readingAborted && this->uploader != nullptr) {
        std::cout << "finalizing uploader" << std::endl;
        if (!currentChunk.empty()) {
          this->uploader->addPart(this->currentChunk);
        }
        this->uploader->finishUpload();
        std::cout << "adding records to the database" << std::endl;
        database::DatabaseManager::getInstance().putBlobItem(*this->blobItem);
        const database::ReverseIndexItem reverseIndexItem(
            holder, this->blobHash);
        database::DatabaseManager::getInstance().putReverseIndexItem(
            reverseIndexItem);
      } else {
        throw std::runtime_error(this->status.error_message());
      }
    }
  }
};

} // namespace reactor
} // namespace network
} // namespace comm
