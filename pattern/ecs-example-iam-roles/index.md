---
title: Example IAM task execution roles for ECS and Fargate
description: >-
  IAM statements for ECS task execution roles
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
authors:
  - peckn
date: Sept 6 2023
---

Amazon Elastic Container Service (ECS) uses two different types of Identity and Access Management (IAM) roles:

* Task execution role - This role is used by Amazon provided code inside of the ECS agent, to setup the launch environment for the task.
* Task role - This role that is used by your own code running inside of the task.

To better understand the relationship between these two roles consider the following diagram of an EC2 instance that is running an ECS task:

!!! @/pattern/ecs-example-iam-roles/ecs-task-execution-role.svg

The task execution role is used at the host level, by the ECS agent. The ECS agent uses the role to set up an execution environment for your container. The task role is used inside of the container, by your own code which is running inside of the container.

### Starter ECS task execution role

AWS provides an example managed policy for starting out. You can access this AWS managed policy via its name `AmazonECSTaskExecutionRolePolicy`. It contains the following statements:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

These statements authorize the ECS agent running on a host to do the following tasks:

- Talk to the Amazon Elastic Container Registry service to download a container image that you have stored there.
- Talk to Amazon CloudWatch to upload application logs that were produced by your application running inside of the container.

You can use this starter policy by attaching it to a role. For example in CloudFormation:

```yaml
  ECSTaskExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
        - Effect: Allow
          Principal:
            Service: [ecs-tasks.amazonaws.com]
          Action: ['sts:AssumeRole']
      Path: /
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### Minimal surface area task execution role

The basic starter task execution role limits the types of actions that ECS can do, but does not
impose any additional limits on the destinations for those actions. You may wish to further limit
the task execution role to create a role that has even less surface area.

For example:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "arn:aws:ecr:us-west-1:209640446841:repository/my-repo/my-tag",
      "Effect": "Allow"
    },
    {
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*",
      "Effect": "Allow"
    },
    {
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-west-1:209640446841:log-group:my-log-group-name:*",
      "Effect": "Allow"
    }
  ]
}
```

The IAM policy above shows how you can limit ECS so that it can only download a specific image from ECR, and it can only upload logs to a specific log group.

### One shared task execution policy, or task execution policy per task?

When deciding whether to limit the surface area of a task exeuction policy, you must also decide whether
you want to create a single shared task execution policy that is used for launching all tasks, or whether
you want each task to have its own unique task execution policy.