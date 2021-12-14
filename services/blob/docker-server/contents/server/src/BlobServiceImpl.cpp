#include "BlobServiceImpl.h"
#include "AwsObjectsFactory.h"
#include "DatabaseManager.h"
#include "MultiPartUploader.h"
#include "Tools.h"

#include <iostream>

namespace comm {
namespace network {

BlobServiceImpl::BlobServiceImpl() {
  Aws::InitAPI({});

  if (!AwsStorageManager::getInstance()
           .getBucket(this->bucketName)
           .isAvailable()) {
    throw std::runtime_error("bucket " + this->bucketName + " not available");
  }

  this->cleanup = std::make_unique<Cleanup>(this->bucketName);
}

BlobServiceImpl::~BlobServiceImpl() { Aws::ShutdownAPI({}); }

/*
(findBlobItem)- Search for the fileHash in the database, if it doesn't exist:
  (-)- create a place for this file and upload it to the S3
  (-)- compute a fileHash of the uploaded file and verify that it's the same as
    provided in the argument
  (putBlobItem)- store a fileHash and a place where the file was saved in the DB
(putReverseIndexItem)- store a reverse index in the DB for a
given fileHash
(updateBlobItem)- set `remove_candidate` for this fileHash to `false`
*/
grpc::Status BlobServiceImpl::Put(grpc::ServerContext *context,
                                  grpc::ServerReader<blob::PutRequest> *reader,
                                  google::protobuf::Empty *response) {
  blob::PutRequest request;
  std::string reverseIndex;
  std::string receivedFileHash;
  std::unique_ptr<database::S3Path> s3Path;
  std::shared_ptr<database::BlobItem> blobItem;
  std::unique_ptr<MultiPartUploader> uploader;
  std::string currentChunk;
  try {
    AwsS3Bucket bucket =
        AwsStorageManager::getInstance().getBucket(this->bucketName);
    while (reader->Read(&request)) {
      const std::string requestReverseIndex = request.reverseindex();
      const std::string requestFileHash = request.filehash();
      const std::string receivedDataChunk = request.datachunk();
      if (requestReverseIndex.size()) {
        std::cout << "Blob Service => Put(this log will be removed) "
                     "reading reverse index ["
                  << requestReverseIndex << "]" << std::endl;
        reverseIndex = requestReverseIndex;
      } else if (requestFileHash.size()) {
        std::cout << "Backup Service => Put(this log will be removed) "
                     "reading file fileHash ["
                  << requestFileHash << "]" << std::endl;
        receivedFileHash = requestFileHash;
      } else if (receivedDataChunk.size()) {
        std::cout << "Backup Service => Put(this log will be removed) "
                     "reading chunk ["
                  << receivedDataChunk.size() << "]" << std::endl;
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
        currentChunk += receivedDataChunk;
        std::cout << "current data chunk: " << currentChunk.size() << " ?< "
                  << AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE << std::endl;
        if (currentChunk.size() > AWS_MULTIPART_UPLOAD_MINIMUM_CHUNK_SIZE) {
          if (uploader == nullptr) {
            if (!reverseIndex.size() || !receivedFileHash.size()) {
              throw std::runtime_error(
                  "Invalid request: before starting "
                  "pushing data chunks, please "
                  "provide file fileHash and reverse index");
            }
            if (s3Path == nullptr) {
              throw std::runtime_error("S3 path has not been created but data "
                                       "chunks are being pushed");
            }
            std::cout << "creating MPU uploader" << std::endl;
            uploader = std::make_unique<MultiPartUploader>(
                AwsObjectsFactory::getS3Client(), this->bucketName,
                s3Path->getFullPath());
          }
          std::cout << "adding chunk to uploader " << currentChunk.size()
                    << std::endl;
          uploader->addPart(currentChunk);
          currentChunk.clear();
        }
      }
      if (reverseIndex.size() && receivedFileHash.size() && s3Path == nullptr) {
        std::cout << "create S3 Path" << std::endl;
        blobItem = std::dynamic_pointer_cast<database::BlobItem>(
            database::DatabaseManager::getInstance().findBlobItem(
                receivedFileHash));
        if (blobItem != nullptr) {
          std::cout << "S3 Path exists: " << blobItem->s3Path.getFullPath()
                    << std::endl;
          // todo terminate reader is necessary here?
          break;
        } else {
          s3Path = std::make_unique<database::S3Path>(
              Tools::getInstance().generateS3Path(this->bucketName,
                                                  receivedFileHash));
          std::cout << "created new S3 Path: " << s3Path->getFullPath()
                    << std::endl;
        }
      }
    }
    if (uploader != nullptr) {
      if (!currentChunk.empty()) {
        std::cout << "add last part to MPU " << currentChunk.size()
                  << std::endl;
        uploader->addPart(currentChunk);
      }
      std::cout << "finish uploader" << std::endl;
      uploader->finishUpload();
    } else {
      std::cout << "write normally without MPU" << std::endl;
      bucket.writeObject(s3Path->getObjectName(), currentChunk);
    }
    // compute a fileHash and verify with a provided fileHash
    const std::string computedFileHash =
        receivedFileHash; // this->computeHashForFile(*s3Path); // TODO FIX THIS
    if (receivedFileHash != computedFileHash) {
      std::string errorMessage = "fileHash mismatch, provided: [";
      errorMessage +=
          receivedFileHash + "], computed: [" + computedFileHash + "]";
      throw std::runtime_error(errorMessage);
    }
    // putBlobItem - store a fileHash and a path in the DB
    if (blobItem == nullptr) {
      blobItem =
          std::make_shared<database::BlobItem>(receivedFileHash, *s3Path);
      database::DatabaseManager::getInstance().putBlobItem(*blobItem);
    } else if (blobItem->removeCandidate) {
      database::DatabaseManager::getInstance().updateBlobItem(
          blobItem->fileHash, "removeCandidate", "0");
    }
    // putReverseIndexItem - store a reverse index in the DB for a given
    // fileHash
    const database::ReverseIndexItem reverseIndexItem(reverseIndex,
                                                      receivedFileHash);
    database::DatabaseManager::getInstance().putReverseIndexItem(
        reverseIndexItem);
    // updateBlobItem - set remove candidate to false
    //    (it can be true if the fileHash already existed) - already done
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
  std::cout << "reading data for reverse index: " << reverseIndex << std::endl;
  try {
    database::S3Path s3Path = Tools::getInstance().findS3Path(reverseIndex);

    AwsS3Bucket bucket =
        AwsStorageManager::getInstance().getBucket(s3Path.getBucketName());
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
  } catch (...) {
    std::cout << "unknown error" << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, "unknown error");
  }
  return grpc::Status::OK;
}

/*
(findReverseIndexItemByReverseIndex)- search for the file fileHash by the
reverse index (removeReverseIndexItem)- remove the current reverse index
()- run the cleanup process for this fileHash
*/
grpc::Status BlobServiceImpl::Remove(grpc::ServerContext *context,
                                     const blob::RemoveRequest *request,
                                     google::protobuf::Empty *response) {
  const std::string reverseIndex = request->reverseindex();
  try {
    // database::S3Path s3Path = Tools::getInstance().findS3Path(reverseIndex);
    // AwsS3Bucket bucket =
    //     AwsStorageManager::getInstance().getBucket(s3Path.getBucketName());
    // bucket.removeObject(s3Path.getObjectName());
    std::shared_ptr<database::ReverseIndexItem> reverseIndexItem =
        std::dynamic_pointer_cast<database::ReverseIndexItem>(
            database::DatabaseManager::getInstance()
                .findReverseIndexItemByReverseIndex(reverseIndex));
    if (reverseIndexItem == nullptr) {
      std::string errorMessage = "no item found for reverse index: ";
      errorMessage += reverseIndex;
      throw std::runtime_error(errorMessage);
    }
    database::DatabaseManager::getInstance().removeReverseIndexItem(
        reverseIndexItem->reverseIndex);
    this->cleanup->perform(reverseIndexItem->fileHash);
  } catch (std::runtime_error &e) {
    std::cout << "error: " << e.what() << std::endl;
    return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
  }
  return grpc::Status::OK;
}

} // namespace network
} // namespace comm
