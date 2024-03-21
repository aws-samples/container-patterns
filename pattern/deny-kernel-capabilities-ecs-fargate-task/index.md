---
title: Deny Linux kernel capabilities for Amazon ECS and AWS Fargate tasks
description: >-
  Use policy as code to restrict Linux kernel capabilities for a container task
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: policy-as-code
authors:
  - peckn
date: Mar 18, 2024
---

#### What and why?

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) is a container orchestrator that launches and manages container deployments on your behalf. It configures the settings that are used when running the application container. One of those settings that can be configured is the Linux capabilities of the application container.

Linux capabilities are a way to limit or increase the level of access a process
has to use the full capabilities of the Linux kernel. Elevated capabilities could
be exploited by a process to "break out" of it's container and interfere with the host. On the other hand, limiting capabilities is a good way to build further
limits around a process that may be running potential untrustworthy code.

In this pattern you will learn how to deny containers linux capabilities using [CloudFormation Guard](https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html), an open-source, general-purpose, policy-as-code evaluation tool.

::: tip
If you are deploying Amazon ECS tasks on AWS Fargate then there are already existing restrictions on which
Linux capabilities can be added. See the [`KernelCapabilities` documentation for a list of the capabilities that can be added, as well as the current AWS Fargate restrictions on capabilities](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KernelCapabilities.html). This pattern is primarily applicable to deploying Amazon ECS tasks on EC2 capacity.
:::

#### Dependencies

<!--@include: @/parts/cloudformation-guard.md-->

#### CloudFormation Guard Rule

<<< files/no-capabilities-for-tasks.guard

#### Sample Templates

The following sample CloudFormation templates can be used to verify that this rule works:

<tabs>

<tab label="Good ECS tasks">

<<< files/safe-task-def.yml

</tab>
<tab label="Bad ECS tasks">

<<< files/bad-task-def.yml

</tab>

</tabs>

#### Usage


You can validate the sample CloudFormation templates against the CloudFormation guard rule using the following command:

```sh
cfn-guard validate --data *.yml --rules .
```

You should see output similar to this:

```txt
bad-task-def.yml Status = FAIL
FAILED rules
no-capabilities-for-tasks.guard/tasks_denied_linux_capabilities    FAIL
---
Evaluating data bad-task-def.yml against rules no-capabilities-for-tasks.guard
Number of non-compliant resources 1
Resource = AddedCapabilityTaskDefinition {
  Type      = AWS::ECS::TaskDefinition
  Rule = tasks_denied_linux_capabilities {
    ALL {
      Check =  LinuxParameters.Capabilities.Add not EXISTS   {
        ComparisonError {
          Error            = Check was not compliant as property [/Resources/AddedCapabilityTaskDefinition/Properties/ContainerDefinitions/0/LinuxParameters/Capabilities/Add[L:17,C:16]] existed.
          PropertyPath    = /Resources/AddedCapabilityTaskDefinition/Properties/ContainerDefinitions/0/LinuxParameters/Capabilities/Add[L:17,C:16]
          Operator        = NOT EXISTS
          Code:
               15.          LinuxParameters:
               16.            Capabilities:
               17.              Add:
               18.                - SYS_ADMIN

        }
      }
    }
  }
}
```

#### See Also

More policy as code patterns:

- [Enforce non-blocking mode for awslogs logging driver, with CloudFormation Guard policy as code](nonblocking-awslogs-policy-as-code)
- [Enforce readonly root filesystem for containers in ECS, with CloudFormation Guard policy as code](enforce-read-only-root-filesystem-ecs-policy-as-code)
- [Deny privileged container mode in Amazon ECS with CloudFormation Guard policy as code](deny-privileged-container-ecs-policy-as-code)
- [Deny root user for Amazon ECS and AWS Fargate tasks](deny-root-user-ecs-fargate-task)