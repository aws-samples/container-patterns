---
title: ECS Task Execution IAM Role for AWS Secrets Manager
description: >-
  ECS task execution IAM role that allows attaching a secrets to an ECS task
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
authors:
  - peckn
date: Sep 6 2023
---

The following CloudFormation example shows how to write a task execution role for Amazon Elastic File System (ECS) which allows ECS to fetch a secret value stored in AWS Secrets Manager.

```yaml
# The secret itself
Secret:
  Type: AWS::SecretsManager::Secret
  Properties:
    GenerateSecretString:
      PasswordLength: 30
      ExcludePunctuation: true

# Base task execution role
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

# Grant ECS the ability to fetch the secrets
TaskAccessToSecret:
  Type: AWS::IAM::Policy
  Properties:
    Roles:
      - !Ref TaskExecutionRole
    PolicyName: AccessSecret
    PolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Action:
            - secretsmanager:DescribeSecret
            - secretsmanager:GetSecretValue
          Resource: !Ref Secret
```

This role starts out based on the default `AmazonECSTaskExecutionRolePolicy` managed policy provided by
AWS. The base managed role has minimal permissions that allow launching a task and collecting logs, but nothing else.

By attaching additional `secretsmanager:*` actions, you can enable the ECS agent to fetch the secret value and inject it into the running task.
