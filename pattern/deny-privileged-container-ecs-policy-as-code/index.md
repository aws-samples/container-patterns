---
title: Deny privileged container mode in Amazon ECS with CloudFormation Guard policy as code
description: >-
  Restrict the ability to launch ECS tasks in privileged mode, using policy as code.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: policy-as-code
authors:
  - peckn
date: Nov 14, 2023
---

#### About

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) is a container orchestrator that launches and manages container deployments on your behalf.

[CloudFormation Guard](https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html) is an open-source, general-purpose, policy-as-code evaluation tool. It helps you define policies that you can use to enforce best practice standards in your infrastructure as code.

This pattern will show you how to use CloudFormation Guard to enforce that developers who have access to deploy on your AWS account can't deploy Amazon ECS containers in privileged mode. Any CloudFormation infrastructure as code that defines a privileged container will be caught, and can be blocked in CI/CD process prior to deployment.

#### Why?

A privileged container is missing most of the normal protections that are used to keep containers isolated from each other and isolated from the underlying host. This is because the privileged container is inheriting the capabilities of the container runtime process that launched it. That parent process is typically going to have quite a lot of privileges, because container runtimes need to hook into many of the operating system fundamentals in order to setup a container.

Generally speaking you should not launch a container with a privileged mode turned on unless you have a very specific use case that requires it.

#### Dependencies

This pattern uses [CloudFormation Guard](https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html), which can be installed with the following command:

```sh
curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/aws-cloudformation/cloudformation-guard/main/install-guard.sh | sh
export PATH=~/.guard/bin:$PATH
cfn-guard --version
```

You can also see the [install instructions for other systems](https://docs.aws.amazon.com/cfn-guard/latest/ug/setting-up.html).

#### CloudFormation Guard Rule

<<< files/privileged-tasks.guard

#### Sample Templates

The following sample CloudFormation templates can be used to verify that this rule works:

<tabs>

<tab label="Non-privileged ECS task">

<<< files/safe-task-def.yml

</tab>
<tab label="Privileged ECS task">

<<< files/privileged-task-def.yml

</tab>

</tabs>

#### Usage


You can validate the sample CloudFormation templates against the CloudFormation guard rule using the following command:

```sh
cfn-guard validate --data *.yml --rules .
```

You will see output similar to this:

```txt
privileged-task-def.yml Status = FAIL
FAILED rules
privileged-tasks.guard/tasks_denied_privileged_condition    FAIL
---
Evaluating data privileged-task-def.yml against rules privileged-tasks.guard
Number of non-compliant resources 1
Resource = PrivilegedTaskDefinition {
  Type      = AWS::ECS::TaskDefinition
  Rule = tasks_denied_privileged_condition {
    ALL {
      ANY {
        Check =  Privileged not EXISTS   {
          ComparisonError {
            Error            = Check was not compliant as property [/Resources/PrivilegedTaskDefinition/Properties/ContainerDefinitions/0/Privileged[L:14,C:22]] existed.
            PropertyPath    = /Resources/PrivilegedTaskDefinition/Properties/ContainerDefinitions/0/Privileged[L:14,C:22]
            Operator        = NOT EXISTS
            Code:
                 12.        - Name: alpine
                 13.          Image: public.ecr.aws/docker/library/alpine:latest
                 14.          Essential: true
                 15.          Privileged: true

          }
        }
        Check =  Privileged not EQUALS  true {
          ComparisonError {
            Error            = Check was not compliant as property value [Path=/Resources/PrivilegedTaskDefinition/Properties/ContainerDefinitions/0/Privileged[L:14,C:22] Value=true] equal to value [Path=[L:0,C:0] Value=true].
            PropertyPath    = /Resources/PrivilegedTaskDefinition/Properties/ContainerDefinitions/0/Privileged[L:14,C:22]
            Operator        = NOT EQUAL
            Value           = true
            ComparedWith    = true
            Code:
                 12.        - Name: alpine
                 13.          Image: public.ecr.aws/docker/library/alpine:latest
                 14.          Essential: true
                 15.          Privileged: true

          }
        }
      }
    }
  }
}
```

The `cfn-guard` process will also exit with a non-zero exit code. In a typical CI/CD server, this exceptional exit will stop the release process, and return an error. This allows you to use CloudFormation guard as a gate that blocks privileged containers from being released to your infrastructure.

#### See Also



More policy as code patterns:

- [Enforce non-blocking mode for awslogs logging driver, with CloudFormation Guard policy as code](nonblocking-awslogs-policy-as-code)