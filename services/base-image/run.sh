#/bin/bash

set -e

# this script should be run from the comm's root directory

IMAGE_NAME="commapp/services-base"
VERSION="1.0"
IMAGES_IDS=$(docker images -f "reference=$IMAGE_NAME" -q)
NIMAGES=$(docker images -f "reference=$IMAGE_NAME" -q | wc -l | sed 's/ //g')

if [[ $NIMAGES -gt 1 ]]
then
  echo "There's more than one image '$IMAGE_NAME'. Due to possible large sizes of images creating a new one will be aborted now. Please remove images manually and run this script again."
  echo "You can run:"
  echo "docker rmi $(echo $IMAGES_IDS)"
  exit 1;
elif [[ $NIMAGES -eq 1 ]]
then
  echo "An image $IMAGE_NAME already exists. A new one will not be created, the current one will be used."
  echo "If you encounter errors, please remove this image manually and re-run this script."
  echo "To remove this image, you can run:"
  echo "docker rmi $(echo $IMAGES_IDS)"
else
  echo "Creating a new image $IMAGE_NAME"
  docker build -t $IMAGE_NAME:$VERSION -f services/base-image/Dockerfile .
fi
