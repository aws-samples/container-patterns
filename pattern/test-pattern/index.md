---
title: Test ECS Pattern
description: >-
  This is a test pattern to debug the CI and GitHub workflows
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
authors:
  - opomer
date: Jan 23 2025
---

The following is a test pattern containing a CloudFormation Template to test the
CI and GitHub workflows.

```yaml
TaskExecutionRole:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:
      Statement:
        - Effect: Allow
          Principal:
            Service: [ecs-tasks.amazonaws.com]
          Action: ['sts:AssumeRole']
          Condition:
            ArnLike:
              aws:SourceArn: !Sub arn:aws:ecs:${AWS::Region}:${AWS::AccountId}:*
            StringEquals:
              aws:SourceAccount: !Ref AWS::AccountId
    ManagedPolicyArns:
      - arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```