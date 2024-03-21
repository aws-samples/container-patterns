---
title: Enforce readonly root filesystem for containers in ECS, with CloudFormation Guard policy as code
description: >-
  Ensure that containers running via Amazon ECS have a readonly root filesystem that can not be mutated.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: policy-as-code
authors:
  - peckn
date: Jan 12, 2024
---

#### About

[CloudFormation Guard](https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html) is a policy as code tool. It evaluates rules which enforce that your infrastructure as code adheres to your organization's desired policies.

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) is a container orchestration tool that helps you run your applications on AWS, and connect those applications to a variety of other AWS services.

Amazon ECS supports a variety of settings that can be used to configure the environment of running containers. One of those settings is `readonlyRootFilesystem`, which is used to ensure that containers can only read from the filesystem, but not make changes to it.

#### Why?

Containers are inherently immutable. While it is possible for a container to temporarily mutate it's root filesystem, the next time you stop the container and restart the container, the root filesystem will go back to how it was in the original container image. Any changes to the root filesystem will be wiped out each time you restart the container.

Enforcing a read only root filesystem makes this behavior much more explicit, and it removes the opportunity for misuse of the ephemeral container root filesystem. You can still attach volumes to the container, and these volumes could be configured to accept both reads and writes. It is considered best practice to turn on read only root filesystems, so that any paths that do need to be written to can be explicitly opted in to writes by attaching a writable Docker volume to that path.

#### Dependencies

<!--@include: @/parts/cloudformation-guard.md-->

#### Guard Rule

<<< ./files/read-only-root-filesystem.guard

#### Guard Test

You can use the following test files to ensure that this Guard rule works:

The following sample CloudFormation templates can be used to verify that this rule works:

<tabs>

<tab label="Readonly root filesystem">

<<< ./files/readonly-root-filesystem.yml

</tab>
<tab label="Writable root filesystem">

<<< ./files/writable-root-filesystem.yml

</tab>

</tabs>

#### Usage

You can validate the test CloudFormation templates above against the Guard rule using the following command:

```sh
cfn-guard validate --data *.yml --rules .
```

You should see output similar to this:

```txt
writable-root-filesystem.yml Status = FAIL
FAILED rules
read-only-root-filesystem.guard/readonly_root_filesystem_condition    FAIL
---
Evaluating data writable-root-filesystem.yml against rules read-only-root-filesystem.guard
Number of non-compliant resources 2
Resource = WritableRootTaskDefinition {
  Type      = AWS::ECS::TaskDefinition
  Rule = readonly_root_filesystem_condition {
    ALL {
      Check =  ReadonlyRootFilesystem EQUALS  true {
        ComparisonError {
          Error            = Check was not compliant as property value [Path=/Resources/WritableRootTaskDefinition/Properties/ContainerDefinitions/0/ReadonlyRootFilesystem[L:24,C:34] Value=false] not equal to value [Path=[L:0,C:0] Value=true].
          PropertyPath    = /Resources/WritableRootTaskDefinition/Properties/ContainerDefinitions/0/ReadonlyRootFilesystem[L:24,C:34]
          Operator        = EQUAL
          Value           = false
          ComparedWith    = true
          Code:
               22.        - Name: alpine
               23.          Image: public.ecr.aws/docker/library/alpine:latest
               24.          Essential: true
               25.          ReadonlyRootFilesystem: false

        }
      }
    }
  }
}
Resource = DefaultTaskDefinition {
  Type      = AWS::ECS::TaskDefinition
  Rule = readonly_root_filesystem_condition {
    ALL {
      Check =  ReadonlyRootFilesystem EQUALS  true {
        RequiredPropertyError {
          PropertyPath = /Resources/DefaultTaskDefinition/Properties/ContainerDefinitions/0[L:10,C:10]
          MissingProperty = ReadonlyRootFilesystem
          Reason = Could not find key ReadonlyRootFilesystem inside struct at path /Resources/DefaultTaskDefinition/Properties/ContainerDefinitions/0[L:10,C:10]
          Code:
                8.      Cpu: 256
                9.      Memory: 128
               10.      ContainerDefinitions:
               11.        - Name: alpine
               12.          Image: public.ecr.aws/docker/library/alpine:latest
               13.          Essential: true
        }
      }
    }
  }
}
```

The `cfn-guard` process will also exit with a non-zero exit code. In a typical CI/CD server, this exceptional exit will stop the release process, and return an error. This allows you to use CloudFormation guard as a gate that blocks privileged containers from being released to your infrastructure.

More policy as code patterns:

- [Enforce non-blocking mode for awslogs logging driver, with CloudFormation Guard policy as code](nonblocking-awslogs-policy-as-code)
- [Deny privileged container mode in Amazon ECS with CloudFormation Guard policy as code](deny-privileged-container-ecs-policy-as-code)
- [Deny Linux kernel capabilities for Amazon ECS and AWS Fargate tasks](deny-kernel-capabilities-ecs-fargate-task)
- [Deny root user for Amazon ECS and AWS Fargate tasks](deny-root-user-ecs-fargate-task)