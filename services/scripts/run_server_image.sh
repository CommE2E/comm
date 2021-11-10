#/bin/bash

set -e

# this script should be run from the comm's root directory

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Illegal number of parameters, expected:"
  echo "- one argument with a path to a directory containing Dockerfile and a config file"
  echo "- one optional argument `port`"
  echo "- example: `./services/scripts/run_server_image.sh ./services/tunnelbroker/docker-server 12345`"
  exit 1;
fi

PORT="50051"
if [ ! -z "$2" ]; then
  PORT=$2
fi

re='^[0-9]+$'
if [[ ! "$PORT" =~ $re ]]; then
  echo "given port value [$PORT] is not a number, aborting"
  exit 1;
fi

GIVEN_PATH=$1
CONFIG_PATH=$GIVEN_PATH/config.sh
DOCKERFILE_PATH=$GIVEN_PATH/Dockerfile

if [ ! -f $CONFIG_PATH ]; then
  echo "Config file not found in $GIVEN_PATH, it has to be named \`config.sh\`"
  exit 1;
fi

if [ ! -f $DOCKERFILE_PATH ]; then
  echo "Dockerfile not found in $GIVEN_PATH"
  exit 1;
fi

echo "reading configuration from $GIVEN_PATH"
source $CONFIG_PATH

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
  echo "Overwriting an existing image"
  docker stop $(echo $CONTAINERS_IDS) && docker rm $(echo $CONTAINERS_IDS)
  docker rmi $IMAGE_NAME:$VERSION

  docker build -t $IMAGE_NAME:$VERSION -f $DOCKERFILE_PATH .
  docker run -it -p $PORT:50051 $EXTRA_ARGS $IMAGE_NAME:$VERSION
else
  echo "Creating a new container for image $IMAGE_NAME"
  docker build -t $IMAGE_NAME:$VERSION -f $DOCKERFILE_PATH .
  docker run -it -p $PORT:50051 $EXTRA_ARGS $IMAGE_NAME:$VERSION
fi
