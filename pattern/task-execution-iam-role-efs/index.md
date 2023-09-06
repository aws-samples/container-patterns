---
title: ECS Task Execution IAM Role for Elastic File System (EFS)
description: >-
  ECS task execution IAM role that allows mounting an Elastic File System (EFS)
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: feature
    value: efs
authors:
  - peckn
alternatives:
  - key: tool
    value: copilot
    id: elastic-file-system-aws-copilot
    description: Use AWS Copilot to launch a task that has an attached Elastic File System. This will automatically create the right IAM roles for you.
  - key: tool
    value: cloudformation
    id: cloudformation-ecs-durable-task-storage-with-efs
    description: This AWS CloudFormation reference application shows how to define the full Elastic  File System connection to Amazon ECS, including the appropriate security group rules.
  - key: tool
    value: cdk
    id: elastic-file-system-ecs-cdk
    description: This is an AWS Cloud Development Kit application that helps you to define
      an ECS task with an attached Elastic File System.
date: Sep 6 2023
---

The following CloudFormation example shows how to write a task execution role for Amazon Elastic File System (ECS) which allows ECS to mount an Elastic File System to a task.

```yaml
TaskExecutionRole:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Principal:
            Service: ecs-tasks.amazonaws.com
          Action: sts:AssumeRole
    ManagedPolicyArns:
      - arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
    Policies:
      - PolicyName: EFSAccess
        PolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - elasticfilesystem:ClientMount
                - elasticfilesystem:ClientWrite
                - elasticfilesystem:DescribeMountTargets
                - elasticfilesystem:DescribeFileSystems
              Resource: !GetAtt EFSFileSystem.Arn
```

This role starts out based on the default `AmazonECSTaskExecutionRolePolicy` managed policy provided by
AWS. The base managed role has minimal permissions that allow launching a task and collecting logs, but nothing else.

By attaching additional `elasticfilesystem:*` actions, you can enable the ECS agent to locate and mount an Elastic File System as part of task startup.
