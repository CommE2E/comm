#/bin/bash

set -e

# this script should be run from the comm's root directory

IMAGE_NAME="tunnelbroker-server"
VERSION="1.0"
CONTAINERS_IDS=$(docker ps -aq -f ancestor=$IMAGE_NAME:$VERSION)
NCONTAINERS=$(docker ps -aq -f ancestor=$IMAGE_NAME:$VERSION | wc -l | sed 's/ //g')

if [[ $NCONTAINERS -gt 1 ]]
then
  echo "There's more than one container of '$IMAGE_NAME' image. Due to possible large sizes of containers creating a new one will be aborted now. Please remove containers manually and run this script again."
  echo "You can run:"
  echo "docker stop $(echo $CONTAINERS_IDS) && docker rm $(echo $CONTAINERS_IDS)"
  exit 0;
elif [[ $NCONTAINERS -eq 1 ]]
then
  echo "A container of image $IMAGE_NAME already exists(container id: $CONTAINERS_IDS)."
  if [[ $1 == "--overwrite" ]]
  then
    echo "Overwriting an existing image"
    docker stop $(echo $CONTAINERS_IDS) && docker rm $(echo $CONTAINERS_IDS)
    docker rmi $IMAGE_NAME:$VERSION

    docker build -t $IMAGE_NAME:$VERSION -f services/tunnelbroker/grpc-server/Dockerfile .
    docker run -it -p 50051:50051 $IMAGE_NAME:$VERSION
  else
    echo "A new one will not be created, the current one will be used."
    echo "If you encounter errors, please remove this container manually and re-run this script."
    echo "To remove this container, you can run:"
    echo "docker stop $(echo $CONTAINERS_IDS) && docker rm $(echo $CONTAINERS_IDS)"
    docker start $CONTAINERS_IDS
    docker attach $CONTAINERS_IDS
  fi
else
  echo "Creating a new container for image $IMAGE_NAME"
  docker build -t $IMAGE_NAME:$VERSION -f services/tunnelbroker/grpc-server/Dockerfile .
  docker run -it -p 50051:50051 $IMAGE_NAME:$VERSION
fi
