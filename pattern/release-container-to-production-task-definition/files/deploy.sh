# Put in your own ECR repository URI
REPO_URI="123456789012.dkr.ecr.us-east-2.amazonaws.com"

# Build and push the container image using Docker CLI
COMMIT_SHA=$(git rev-parse HEAD)
docker build -t $REPO_URI:$COMMIT_SHA .
docker tag $REPO_URI:$COMMIT_SHA $REPO_URI:latest
docker push $REPO_URI:$COMMIT_SHA

# Build a task definition
IMAGE_URL="$REPO_URI:$COMMIT_SHA"
CPU=256
MEMORY=512

export TASK_DEFINITION=$(cat << EOF
{
  "family": "my-app",
  "containerDefinitions": [
    {
      "essential": true,
      "image": "$IMAGE_URL",
      "name": "sample-app"
    }
  ],
  "cpu": "$CPU",
  "memory": "$MEMORY"
}
EOF
)

# Register a new task definition revision
TASK_DEFINITION_ARN=$(aws ecs register-task-definition \
  --cli-input-json "$TASK_DEFINITION" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text
)

# Update an ECS service to use this task definition.
CLUSTER="default"
SERVICE="my-app"

aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition $TASK_DEFINITION_ARN