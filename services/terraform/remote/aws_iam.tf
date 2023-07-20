# ECS Task execution role
# Docs: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
data "aws_iam_role" "ecs_task_execution" {
  name = "ecsTaskExecutionRole"
}
