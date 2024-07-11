#!/bin/bash

# Disable AWS cli command pager outputs
export AWS_PAGER=""

# Grab user configuration variables from terraform.tfvars
health_check_domain=$(echo "var.domain_name" | terraform console -var-file terraform.tfvars | tr -d '"')
desired_secondary_nodes=$(echo "var.desired_secondary_nodes" | terraform console -var-file terraform.tfvars)

if [[ -z "${AWS_ACCESS_KEY_ID}" || -z "${AWS_SECRET_ACCESS_KEY}" ]]; then
  echo "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be set to run migration."
  exit 1
fi

cluster_name="keyserver-cluster"
primary_service_name="keyserver-primary-service"
secondary_service_name="keyserver-secondary-service"

convert_seconds() {
  total_seconds=$1
  minutes=$((total_seconds / 60))
  seconds=$((total_seconds % 60))

  if (( minutes > 0 )); then
    echo "${minutes} minute(s) and ${seconds} seconds"
  else
    echo "${seconds} seconds"
  fi
}

check_health() {
  local domain=$1
  local health_url="https://${domain}/health"
  local retry_interval=10
  local total_elapsed_time=0
  
  while true; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$health_url")
    if [ "$http_code" -eq 200 ]; then
      echo "Health check returned status 200 OK $http_code. Primary keyserver node ready"
      return 0
    fi
    total_elapsed_time=$(( total_elapsed_time + retry_interval ))
    converted_time=$(convert_seconds $total_elapsed_time)

    echo "Health check returned status $http_code. Elapsed time: ${converted_time}."
    sleep $retry_interval
  done
}

# Stop all primary and secondary tasks
echo "Set desired count of secondary service to 0"
aws ecs update-service --cluster $cluster_name --service $secondary_service_name --desired-count 0 > /dev/null

echo "Set desired count of primary service to 0"
aws ecs update-service --cluster $cluster_name --service $primary_service_name --desired-count 0 > /dev/null

echo "Taking down all secondary nodes in $cluster_name"

task_arns=$(aws ecs list-tasks --cluster $cluster_name --service-name $secondary_service_name --query 'taskArns[*]' --output text)

for task_arn in $task_arns; do
  echo "Stopping task $task_arn"
  aws ecs stop-task --cluster "$cluster_name" --task "$task_arn" > /dev/null
done

primary_task_arns=$(aws ecs list-tasks --cluster $cluster_name --service-name $primary_service_name --query 'taskArns[*]' --output text)

for primary_task_arn in $primary_task_arns; do
  echo "Stopping task $primary_task_arn"
  aws ecs stop-task --cluster "$cluster_name" --task "$primary_task_arn" > /dev/null
done

# Sleeping 15 seconds for tasks to properly stop
sleep 15

# Redeploy primary node for migration to run
echo "Reset desired count of primary service to 1"
aws ecs update-service --cluster $cluster_name --service $primary_service_name --desired-count 1 > /dev/null

echo "Redeploying primary service in $cluster_name"
aws ecs update-service --cluster $cluster_name --service $primary_service_name --force-new-deployment > /dev/null

echo "Waiting for health check at $health_check_domain to return status 200 OK"
check_health "$health_check_domain"

echo "Setting desired count of secondary service to $desired_secondary_nodes". Secondary nodes will automatically restart
aws ecs update-service --cluster "$cluster_name" --service "$secondary_service_name" --desired-count "$desired_secondary_nodes" --force-new-deployment > /dev/null

echo "Successfully ran migration"
