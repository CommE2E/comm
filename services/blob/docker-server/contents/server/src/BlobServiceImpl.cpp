#include "BlobServiceImpl.h"
#include "MultiPartUploader.h"

#include <iostream>

namespace comm {
namespace network {

BlobServiceImpl::BlobServiceImpl() {
  Aws::InitAPI({});

  this->storageManager = std::make_unique<AwsStorageManager>();
  if (!this->storageManager->getBucket(this->bucketName).isAvailable()) {
    throw std::runtime_error("bucket " + this->bucketName + " not available");
  }

  this->databaseManager = std::make_unique<database::DatabaseManager>(
      "blob-service-blob", "blob-service-reverse-index");
}

BlobServiceImpl::~BlobServiceImpl() { Aws::ShutdownAPI({}); }

database::S3Path BlobServiceImpl::generateS3Path(const std::string &fileHash) {
  // todo this may change
  return database::S3Path(this->bucketName, fileHash);
}

std::string
BlobServiceImpl::computeHashForFile(const database::S3Path &s3Path) {
  return "hash"; // TODO
}

database::S3Path BlobServiceImpl::findS3Path(const std::string &reverseIndex) {
  std::shared_ptr<database::ReverseIndexItem> reverseIndexItem =
      std::dynamic_pointer_cast<database::ReverseIndexItem>(
          this->databaseManager->findReverseIndexItemByReverseIndex(
              reverseIndex));
  if (reverseIndexItem == nullptr) {
    std::string errorMessage = "provided reverse index: [";
    errorMessage += reverseIndex + "] has not been found in the database";
    throw std::runtime_error(errorMessage);
  }
  std::shared_ptr<database::BlobItem> blobItem =
      std::dynamic_pointer_cast<database::BlobItem>(
          this->databaseManager->findBlobItem(reverseIndexItem->hash));
  if (blobItem == nullptr) {
    std::string errorMessage = "no blob found for hash: [";
    errorMessage += reverseIndexItem->hash + "]";
    throw std::runtime_error(errorMessage);
  }
  database::S3Path result = blobItem->s3Path;
  return result;
}

/*
(findBlobItem)- Search for the hash in the database, if it doesn't exist:
  (-)- create a place for this file and upload it to the S3
  (-)- compute a hash of the uploaded file and verify that it's the same as
    provided in the argument
  (putBlobItem)- store a hash and a place where the file was saved in the DB
(putReverseIndexItem)- store a reverse index in the DB for a
given hash
(updateBlobItem)- set `remove_candidate` for this hash to `false`
*/
grpc::Status BlobServiceImpl::Put(grpc::ServerContext *context,
                                  grpc::ServerReader<blob::PutRequest> *reader,
                                  google::protobuf::Empty *response) {
  blob::PutRequest request;
  AwsS3Bucket bucket = this->storageManager->getBucket(this->bucketName);
  std::string reverseIndex;
  std::string fileHash;
  std::unique_ptr<database::S3Path> s3Path;
  std::shared_ptr<database::BlobItem> blobItem;
  std::unique_ptr<MultiPartUploader> uploader;
  try {
    while (reader->Read(&request)) {
      const std::string requestReverseIndex = request.reverseindex();
      const std::string requestFileHash = request.filehash();
      const std::string dataChunk = request.datachunk();
      if (requestReverseIndex.size()) {
        std::cout << "Blob Service => Put(this log will be removed) "
                     "reading reverse index ["
                  << requestReverseIndex << "]" << std::endl;
        reverseIndex = requestReverseIndex;
      } else if (requestFileHash.size()) {
        std::cout << "Backup Service => Put(this log will be removed) "
                     "reading file hash ["
                  << requestFileHash << "]" << std::endl;
        fileHash = requestFileHash;
      } else if (dataChunk.size()) {
        std::cout << "Backup Service => Put(this log will be removed) "
                     "reading chunk ["
                  << dataChunk << "]" << std::endl;
        // TODO HERE
        // minimum chunk size is 5MB
        // GRPC limit it 4MB
        // we have to do something like this:
        //    - store first chunk in the memory
        //      - if it's less than 4MB, expect no more chunks, if they come -
        //      throw, otherwise write the only chunk with a single
        //      `writeObject`
        //      - if it's 4MB
        //        - await further chunks
        //        - merge them into parts of 5MB, start the multipart uploader
        //        and use it(also uploading chunks of size 8MB could be an
        //        option - 5MB is just a minimum size for a chunk, merging the
        //        chunks in pairs may avoid some complexity in this code)
        //        - if there are 2 chunks, both less than 5MB(e.g. 4MB+0.5MB),
        //        just upload them in a single `writeObject`(don't start the MPU
        //        uploader)
        if (uploader == nullptr) {
          if (!reverseIndex.size() || !fileHash.size()) {
            throw std::runtime_error(
                "Invalid request: before starting pushing data chunks, please "
                "provide file hash and reverse index");
          }
          if (s3Path == nullptr) {
            throw std::runtime_error("S3 path has not been created but data "
                                     "chunks are being pushed");
          }
          uploader = std::make_unique<MultiPartUploader>(
              this->storageManager->getClient(), this->bucketName,
              s3Path->getFullPath());
        }
        uploader->addPart(dataChunk);
      }
      if (reverseIndex.size() && fileHash.size() && s3Path == nullptr) {
        std::cout << "create S3 Path" << std::endl;
        blobItem = std::dynamic_pointer_cast<database::BlobItem>(
            this->databaseManager->findBlobItem(fileHash));
        if (blobItem != nullptr) {
          std::cout << "S3 Path exists: " << blobItem->s3Path.getFullPath()
                    << std::endl;
          // todo terminate reader is necessary here?
          break;
        } else {
          s3Path = std::make_unique<database::S3Path>(
              this->generateS3Path(fileHash));
          std::cout << "created new S3 Path: " << s3Path->getFullPath()
                    << std::endl;
        }
      }
    }
    uploader->finishUpload();
    // compute a hash and verify with a provided hash
    const std::string computedHash = this->computeHashForFile(*s3Path);
    const size_t hashSize = fileHash.size();
    if (fileHash != computedHash) {
      std::string errorMessage = "hash mismatch, provided: [";
      errorMessage += fileHash + "], computed: [" + computedHash + "]";
      throw std::runtime_error(errorMessage);
    }
    // putBlobItem - store a hash and a path in the DB
    if (blobItem == nullptr) {
      blobItem = std::make_shared<database::BlobItem>(fileHash, *s3Path);
      this->databaseManager->putBlobItem(*blobItem);
    } else if (blobItem->removeCandidate) {
      this->databaseManager->updateBlobItem(blobItem->hash, "removeCandidate",
                                            "0");
    }
    // putReverseIndexItem - store a reverse index in the DB for a given hash
    const database::ReverseIndexItem reverseIndexItem(fileHash, reverseIndex);
    this->databaseManager->putReverseIndexItem(reverseIndexItem);
    // updateBlobItem - set remove candidate to false
    //    (it can be true if the hash already existed) - already done
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
}

/*
(findReverseIndexItemByReverseIndex)- search for the file location on S3 in the
database by the reverse index
*/
grpc::Status
BlobServiceImpl::Get(grpc::ServerContext *context,
                     const blob::GetRequest *request,
                     grpc::ServerWriter<blob::GetResponse> *writer) {
  const std::string reverseIndex = request->reverseindex();
  database::S3Path s3Path = this->findS3Path(reverseIndex);

  AwsS3Bucket bucket = this->storageManager->getBucket(s3Path.getBucketName());
  try {
    blob::GetResponse response;
    std::function<void(const std::string &)> callback =
        [&response, &writer](std::string chunk) {
          response.set_datachunk(chunk);
          if (!writer->Write(response)) {
            throw std::runtime_error("writer interrupted sending compaction");
          }
        };

    bucket.getObjectDataChunks(s3Path.getObjectName(), callback,
                               GRPC_CHUNK_SIZE_LIMIT);
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
}

/*
(findReverseIndexItemByReverseIndex)- search for the file hash by the reverse
index
(removeReverseIndexItem)- remove the current reverse index
()- run the cleanup process for this hash
*/
grpc::Status BlobServiceImpl::Remove(grpc::ServerContext *context,
                                     const blob::RemoveRequest *request,
                                     google::protobuf::Empty *response) {
  const std::string reverseIndex = request->reverseindex();
  database::S3Path s3Path = this->findS3Path(reverseIndex);

  AwsS3Bucket bucket = this->storageManager->getBucket(s3Path.getBucketName());
  try {
    bucket.removeObject(s3Path.getObjectName());
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
}

// todo - cleanup

} // namespace network
} // namespace comm
