---
title: Example IAM task execution roles for ECS and Fargate
description: >-
  IAM policies for the ECS task execution role. Guidance on ECS task execution
  best practices.
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

#### Starter ECS task execution role

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

<<< @/pattern/ecs-example-iam-roles/files/ecs-task-execution-role.yml

#### Minimal surface area task execution role

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
      "Resource": "arn:aws:ecr:us-west-1:209640446841:repository/my-repo/*",
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

#### Turning on additional Amazon ECS features

The default `AmazonECSTaskExecutionRolePolicy` task execution policy does not enable every feature of Amazon ECS. In specific there are several additional features you may wish to enable:

* [Task execution policy for attaching secrets in AWS Secret Manager](/task-execution-iam-role-secrets-manager)
* [Task execution policy for attaching an AWS Elastic File System](/task-execution-iam-role-efs)

#### Should you use a shared task execution policy?

When deciding whether to limit the surface area of a task exeuction policy, you must also decide whether
you want to create a single shared task execution policy that is used for launching multiple types of tasks, or whether you want each task to have its own unique task execution policy. There are advantages and disadvantages in both approaches.

A single shared task execution role can be very convenient and easy to understand when getting started.
However the shared task execution will need to be able to access a wider range of AWS resources. You can use a broad role like `AmazonECSTaskExecutionRolePolicy` which does not limit the resource ARN's of images or log groups. Or you can choose to have your shared task role enumerate a list of images and log groups.

The advantage of giving each type of task its own dedicated task execution role is that it allows you to
build fine grained access permissions for each type of task. ECS will use the appropriate level of access for
each task, and will only have permission to do exactly what it needs to do in that moment, and nothing more.
However, this will be more complicated to build out, and will require ongoing updates in the future if you decide
to turn on new features or make changes to images.

In general, it is better to use per task execution roles if you are running multiple tasks that have their own secrets. For example, you can have a task execution role for your API service which allows it to fetch the database password, but run another service that has no access to the database password secret.

#### See Also

- More info on [ECS task execution roles in the official AWS documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html)