#/bin/bash

set -e

# this script should be run from the comm's root directory

if [ "$#" -ne 1 ]; then
  echo "Illegal number of parameters, expected one argument with a path to a directory containing Dockerfile and a config file"
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
  docker build -t $IMAGE_NAME:$VERSION -f $DOCKERFILE_PATH .
fi
