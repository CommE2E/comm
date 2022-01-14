#include "BlobServiceImpl.h"

#include "AwsTools.h"
#include "DatabaseManager.h"
#include "MultiPartUploader.h"
#include "Tools.h"

#include <iostream>
#include <memory>

namespace comm {
namespace network {

BlobServiceImpl::BlobServiceImpl() {
  Aws::InitAPI({});

  if (!getBucket(BLOB_BUCKET_NAME).isAvailable()) {
    throw std::runtime_error("bucket " + BLOB_BUCKET_NAME + " not available");
  }
}

BlobServiceImpl::~BlobServiceImpl() {
  Aws::ShutdownAPI({});
}

void BlobServiceImpl::verifyBlobHash(
    const std::string &expectedBlobHash,
    const database::S3Path &s3Path) {
  const std::string computedBlobHash = computeHashForFile(s3Path);
  if (expectedBlobHash != computedBlobHash) {
    throw std::runtime_error(
        "blob hash mismatch, expected: [" + expectedBlobHash +
        "], computed: [" + computedBlobHash + "]");
  }
}

void BlobServiceImpl::assignVariableIfEmpty(
    const std::string &label,
    std::string &lvalue,
    const std::string &rvalue) {
  if (!lvalue.empty()) {
    throw std::runtime_error(
        "multiple assignment for variable " + label + " is not allowed");
  }
  lvalue = rvalue;
}

grpc::Status BlobServiceImpl::Put(
    grpc::ServerContext *context,
    grpc::ServerReaderWriter<blob::PutResponse, blob::PutRequest> *stream) {
  blob::PutRequest request;
  std::string holder;
  std::string receivedBlobHash;
  std::unique_ptr<database::S3Path> s3Path;
  std::shared_ptr<database::BlobItem> blobItem;
  std::unique_ptr<MultiPartUploader> uploader;
  std::string currentChunk;
  blob::PutResponse response;
  try {
    while (stream->Read(&request)) {
      const std::string requestHolder = request.holder();
      const std::string requestBlobHash = request.blobhash();
      const std::string receivedDataChunk = request.datachunk();
      if (requestHolder.size()) {
        assignVariableIfEmpty("holder", holder, requestHolder);
      } else if (requestBlobHash.size()) {
        assignVariableIfEmpty("blob hash", receivedBlobHash, requestBlobHash);
      } else if (receivedDataChunk.size()) {
        if (s3Path == nullptr) {
          throw std::runtime_error(
              "S3 path or/and MPU has not been created but data "
              "chunks are being pushed");
        }
        if (uploader == nullptr) {
          uploader = std::make_unique<MultiPartUploader>(
              getS3Client(), BLOB_BUCKET_NAME, s3Path->getObjectName());
        }
        currentChunk += receivedDataChunk;
        if (currentChunk.size() > AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE) {
          uploader->addPart(currentChunk);
          currentChunk.clear();
        }
      }
      if (holder.size() && receivedBlobHash.size() && s3Path == nullptr) {
        blobItem = database::DatabaseManager::getInstance().findBlobItem(
            receivedBlobHash);
        if (blobItem != nullptr) {
          s3Path = std::make_unique<database::S3Path>(blobItem->getS3Path());
          response.set_dataexists(true);
          stream->Write(response);
          break;
        }
        s3Path = std::make_unique<database::S3Path>(
            generateS3Path(BLOB_BUCKET_NAME, receivedBlobHash));
        response.set_dataexists(false);
        stream->Write(response);
      }
    }
    if (!currentChunk.empty()) {
      uploader->addPart(currentChunk);
    }
    if (blobItem == nullptr) {
      uploader->finishUpload();
    }
    this->verifyBlobHash(receivedBlobHash, *s3Path);
    if (blobItem == nullptr) {
      blobItem =
          std::make_shared<database::BlobItem>(receivedBlobHash, *s3Path);
      database::DatabaseManager::getInstance().putBlobItem(*blobItem);
    }
    const database::ReverseIndexItem reverseIndexItem(holder, receivedBlobHash);
    database::DatabaseManager::getInstance().putReverseIndexItem(
        reverseIndexItem);
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
}

grpc::Status BlobServiceImpl::Get(
    grpc::ServerContext *context,
    const blob::GetRequest *request,
    grpc::ServerWriter<blob::GetResponse> *writer) {
  const std::string holder = request->holder();
  try {
    database::S3Path s3Path = findS3Path(holder);

    AwsS3Bucket bucket = getBucket(s3Path.getBucketName());
    blob::GetResponse response;
    std::function<void(const std::string &)> callback =
        [&response, &writer](const std::string &chunk) {
          response.set_datachunk(chunk);
          if (!writer->Write(response)) {
            throw std::runtime_error("writer interrupted sending data");
          }
        };

    bucket.getObjectDataChunks(
        s3Path.getObjectName(),
        callback,
        GRPC_CHUNK_SIZE_LIMIT - GRPC_METADATA_SIZE_PER_MESSAGE);
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
}

grpc::Status BlobServiceImpl::Remove(
    grpc::ServerContext *context,
    const blob::RemoveRequest *request,
    google::protobuf::Empty *response) {
  const std::string holder = request->holder();
  try {
    std::shared_ptr<database::ReverseIndexItem> reverseIndexItem =
        database::DatabaseManager::getInstance().findReverseIndexItemByHolder(
            holder);
    if (reverseIndexItem == nullptr) {
      throw std::runtime_error("no item found for holder: " + holder);
    }
    // TODO handle cleanup here properly
    // for now the object's being removed right away
    const std::string blobHash = reverseIndexItem->getBlobHash();
    if (!database::DatabaseManager::getInstance().removeReverseIndexItem(
            holder)) {
      throw std::runtime_error(
          "could not remove an item for holder " + holder +
          "(probably does not exist)");
    }
    if (database::DatabaseManager::getInstance()
            .findReverseIndexItemsByHash(reverseIndexItem->getBlobHash())
            .size() == 0) {
      database::S3Path s3Path = findS3Path(*reverseIndexItem);
      AwsS3Bucket bucket = getBucket(s3Path.getBucketName());
      bucket.removeObject(s3Path.getObjectName());

      database::DatabaseManager::getInstance().removeBlobItem(blobHash);
    }
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
}

} // namespace network
} // namespace comm
