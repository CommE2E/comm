#!/bin/bash

# Disable AWS cli command pager outputs
export AWS_PAGER=""


# Do not change without replacing keyserver_cluster name in aws_ecs.tf
cluster_name="keyserver-cluster"

# Do not change without replacing keyserver_primary_service
# name in keyserver_primary.tf
primary_service_name="keyserver-primary-service"

# Do not change without replacing keyserver_secondary_service
# name in keyserver_secondary.tf
secondary_service_name="keyserver-secondary-service"

# Grab user configuration variables from terraform.tfvars
health_check_domain=$(echo "var.keyserver_domain_name" | terraform console -var-file terraform.tfvars.json | tr -d '"')
health_check_url="https://${health_check_domain}/health"
num_desired_secondary_nodes=$(echo "var.desired_secondary_nodes" | terraform console -var-file terraform.tfvars.json)

if [[ -z "${AWS_ACCESS_KEY_ID}" || -z "${AWS_SECRET_ACCESS_KEY}" ]]; then
  echo "Error: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be set to run migration."
  exit 1
fi

if ! aws sts get-caller-identity > /dev/null; then
  echo "Error: Invalid AWS credentials or not in nix shell. Please check your AWS configuration and/or run nix develop."
  exit 1
fi

convert_seconds() {
  total_seconds="$1"
  minutes="$((total_seconds / 60))"
  seconds="$((total_seconds % 60))"

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
    if [[ "$http_code" -eq 200 ]]; then
      echo "Health check returned status 200 OK $http_code. Primary keyserver node ready"
      return 0
    fi
    total_elapsed_time="$(( total_elapsed_time + retry_interval ))"
    converted_time="$(convert_seconds $total_elapsed_time)"

    echo "Health check returned status $http_code. Elapsed time: ${converted_time}."
    sleep $retry_interval
  done
}

disable_general_lb_traffic() {
  # disables general ip access
  aws ec2 revoke-security-group-ingress \
      --group-id "$(aws ec2 describe-security-groups --filters "Name=group-name,Values=lb-sg" --query "SecurityGroups[0].GroupId" --output text)" \
      --protocol tcp \
      --port 443 \
      --cidr 0.0.0.0/0 > /dev/null

  # enables traffic only for ip calling aws deploy script
  aws ec2 authorize-security-group-ingress \
    --group-id "$(aws ec2 describe-security-groups --filters "Name=group-name,Values=lb-sg" --query "SecurityGroups[0].GroupId" --output text)" \
    --protocol tcp \
    --port 443 \
    --cidr "$(curl ipv4.wtfismyip.com/text)/32" > /dev/null
}

enable_lb_traffic() {
  aws ec2 authorize-security-group-ingress \
    --group-id "$(aws ec2 describe-security-groups --filters "Name=group-name,Values=lb-sg" --query "SecurityGroups[0].GroupId" --output text)" \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 > /dev/null

  # disables personal ip address ingress rule as no longer necessary
  aws ec2 revoke-security-group-ingress \
      --group-id "$(aws ec2 describe-security-groups --filters "Name=group-name,Values=lb-sg" --query "SecurityGroups[0].GroupId" --output text)" \
      --protocol tcp \
      --port 443 \
      --cidr "$(curl ipv4.wtfismyip.com/text)/32" > /dev/null
}

# Stop all primary and secondary tasks and disable traffic to load balancer
echo "Disabling traffic to load balancer"
disable_general_lb_traffic

http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$health_check_url")
if [[ "$http_code" -eq 000 ]]; then
  echo "Error: Health check timed out trying to access keyserver domain at ${health_check_url}."

    echo "Re-enabling traffic to load balancer until domain is accessible and migration script is rerun"
    enable_lb_traffic
    exit 1
fi

echo "Set desired count of secondary service to 0"
aws ecs update-service --cluster "$cluster_name" --service "$secondary_service_name" --desired-count 0 > /dev/null

echo "Taking down all secondary nodes in $cluster_name"

task_arns=$(aws ecs list-tasks --cluster "$cluster_name" --service-name "$secondary_service_name" --query 'taskArns[*]' --output text)

for task_arn in $task_arns; do
  echo "Stopping secondary node running on task $task_arn"
  aws ecs stop-task --cluster "$cluster_name" --task "$task_arn" > /dev/null
done

echo "Set desired count of primary service to 0"
aws ecs update-service --cluster "$cluster_name" --service "$primary_service_name" --desired-count 0 > /dev/null

echo "Taking down primary node in $cluster_name"
primary_task_arns=$(aws ecs list-tasks --cluster "$cluster_name" --service-name "$primary_service_name" --query 'taskArns[*]' --output text)

for primary_task_arn in $primary_task_arns; do
  echo "Stopping primary node running on task $primary_task_arn"
  aws ecs stop-task --cluster "$cluster_name" --task "$primary_task_arn" > /dev/null
done

echo "Waiting until primary and secondary nodes have been shutdown"
total_elapsed_time=0
retry_interval=10
while true; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$health_check_url")

    echo "Health check returned status $http_code. Elapsed time: $(convert_seconds $total_elapsed_time)"

    if [[ "$http_code" -ne 200 ]]; then
        echo "Stopping primary and secondary nodes was successful. Continuing with migration."
        break
    fi

    total_elapsed_time=$(( total_elapsed_time + retry_interval ))
    sleep $retry_interval
done

echo "Redeploying primary service in $cluster_name"
aws ecs update-service --cluster "$cluster_name" --service "$primary_service_name" --force-new-deployment --desired-count 1 > /dev/null

echo "Waiting for health check at $health_check_domain to return status 200 OK"
check_health

echo "Primary node successfully running. Re-enabling public access to load balancer"
enable_lb_traffic

echo "Setting desired count of secondary service to $num_desired_secondary_nodes".
aws ecs update-service --cluster "$cluster_name" --service "$secondary_service_name" --desired-count "$num_desired_secondary_nodes" --force-new-deployment > /dev/null

echo "Successfully ran migration"
