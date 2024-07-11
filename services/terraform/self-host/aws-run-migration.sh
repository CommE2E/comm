#!/bin/bash

# Disable AWS cli command pager outputs
export AWS_PAGER=""

# Grab user configuration variables from terraform.tfvars
health_check_domain=$(echo "var.domain_name" | terraform console -var-file terraform.tfvars | tr -d '"')
health_check_url="https://${health_check_domain}/health"
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
  local retry_interval=10
  local total_elapsed_time=0
  
  while true; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$health_check_url")
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

# Stop all primary and secondary tasks and disable traffic to load balancer
echo "Disabling traffic to load balancer"
aws ec2 revoke-security-group-ingress \
    --group-id "$(aws ec2 describe-security-groups --filters "Name=group-name,Values=lb-sg" --query "SecurityGroups[0].GroupId" --output text)" \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 > /dev/null

echo "Set desired count of secondary service to 0"
aws ecs update-service --cluster $cluster_name --service $secondary_service_name --desired-count 0 > /dev/null

echo "Taking down all secondary nodes in $cluster_name"

task_arns=$(aws ecs list-tasks --cluster $cluster_name --service-name $secondary_service_name --query 'taskArns[*]' --output text)

for task_arn in $task_arns; do
  echo "Stopping secondary node running on task $task_arn"
  aws ecs stop-task --cluster "$cluster_name" --task "$task_arn" > /dev/null
done

echo "Set desired count of primary service to 0"
aws ecs update-service --cluster $cluster_name --service $primary_service_name --desired-count 0 > /dev/null


echo "Taking down primary node in $cluster_name"
primary_task_arns=$(aws ecs list-tasks --cluster $cluster_name --service-name $primary_service_name --query 'taskArns[*]' --output text)

for primary_task_arn in $primary_task_arns; do
  echo "Stopping primary node running on task $primary_task_arn"
  aws ecs stop-task --cluster "$cluster_name" --task "$primary_task_arn" > /dev/null
done

total_elapsed_time=0
retry_interval=10
while true; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$health_check_url")

    echo "Health check returned status $http_code. Elapsed time: $(convert_seconds $total_elapsed_time)"

    if [ "$http_code" -ne 200 ]; then
        echo "Stopping primary and secondary nodes was successful. Continuing with migration."
        break
    fi

    total_elapsed_time=$(( total_elapsed_time + retry_interval ))
    sleep $retry_interval
done

# Redeploy primary node for migration to run
echo "Reset desired count of primary service to 1"
aws ecs update-service --cluster $cluster_name --service $primary_service_name --desired-count 1 > /dev/null

echo "Redeploying primary service in $cluster_name"
aws ecs update-service --cluster $cluster_name --service $primary_service_name --force-new-deployment > /dev/null

echo "Waiting for health check at $health_check_domain to return status 200 OK"
check_health

echo "Setting desired count of secondary service to $desired_secondary_nodes".
aws ecs update-service --cluster "$cluster_name" --service "$secondary_service_name" --desired-count "$desired_secondary_nodes" --force-new-deployment > /dev/null

echo "Waiting on active secondary nodes to match desired secondary nodes"
total_elapsed_time=0
retry_interval=10
while true; do
    running_tasks=$(aws ecs describe-services --cluster "$cluster_name" --services "$secondary_service_name" --query "services[0].runningCount" --output text)
    echo "Running secondary nodes: $running_tasks / $desired_secondary_nodes. Elapsed time: $(convert_seconds $total_elapsed_time)"

    if [ "$running_tasks" -eq "$desired_secondary_nodes" ]; then
        echo "Secondary nodes successfully running. Re-enabling public access to load balancer"
        aws ec2 authorize-security-group-ingress \
          --group-id "$(aws ec2 describe-security-groups --filters "Name=group-name,Values=lb-sg" --query "SecurityGroups[0].GroupId" --output text)" \
          --protocol tcp \
          --port 443 \
          --cidr 0.0.0.0/0 > /dev/null
        break
    fi
    total_elapsed_time=$(( total_elapsed_time + retry_interval ))

    sleep $retry_interval
done

echo "Successfully ran migration"
