---
title: Deny root user for Amazon ECS and AWS Fargate tasks
description: >-
  Prevent container tasks from running as root on Amazon ECS and AWS Fargate
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: policy-as-code
authors:
  - peckn
date: Mar 21, 2024
---

#### What and why?

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) is a container orchestrator that launches and manages container deployments on your behalf. It launches applications as containerized processes. One aspect of a containerized process that you can control is the user that the process runs as.

By default, unless otherwise specified, Docker containers typically run as `root`. However, the `root` user is a special
user with elevated access to the underlying host. Therefore, running a container as `root` greatly increases the risk
that a remote code execution vulnerability can be exploited to access the underlying host or other containers on the host.

In this pattern you will learn how to force Amazon ECS tasks to run containers as non root, by applying [CloudFormation Guard](https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html), an open-source, general-purpose, policy-as-code evaluation tool.

::: tip
On a standard Linux system only the `root` user is allowed to bind to ports below 100. This includes port 80, port 22, and
other well known ports. When running as non `root` you must configure your application to bind to a higher number port, such as port 8080 instead of port 80.
:::

#### Dependencies

<!--@include: @/parts/cloudformation-guard.md-->

#### CloudFormation Guard Rule

<<< files/no-root-for-tasks.guard

::: warning
Note that this rule treats the lack of a `User` field as if the user is `root`. This is because there is no way to tell if the `Dockerfile`
for the container specified a downscoped user or not. It is entirely possible that the container is assuming another user
at runtime. However, the only authoratative way to guarantee this is to explictly set the user that the conatiner will run
as, using the Amazon ECS task definition setting.
:::

#### Sample Templates

The following sample CloudFormation templates can be used to verify that this rule works:

<tabs>

<tab label="Good ECS tasks">

<<< files/safe-task-defs.yml

</tab>
<tab label="Bad ECS tasks">

<<< files/bad-task-defs.yml

</tab>

</tabs>

#### Usage


You can validate the sample CloudFormation templates against the CloudFormation guard rule using the following command:

```sh
cfn-guard validate --data *.yml --rules .
```

You should see output similar to this:

```txt
bad-task-defs.yml Status = FAIL
FAILED rules
no-root-for-tasks.guard/tasks_denied_root    FAIL
---
Evaluating data bad-task-defs.yml against rules no-root-for-tasks.guard
Number of non-compliant resources 3
Resource = AmbiguousUser {
  Type      = AWS::ECS::TaskDefinition
  Rule = tasks_denied_root {
    ALL {
      Check =  User EXISTS   {
        Message = Container in the ECS task definition must specify the `User` property
        RequiredPropertyError {
          PropertyPath = /Resources/AmbiguousUser/Properties/ContainerDefinitions/0[L:13,C:10]
          MissingProperty = User
          Reason = Could not find key User inside struct at path /Resources/AmbiguousUser/Properties/ContainerDefinitions/0[L:13,C:10]
          Code:
               11.      Cpu: 256
               12.      Memory: 128
               13.      ContainerDefinitions:
               14.        - Name: alpine
               15.          Image: public.ecr.aws/docker/library/alpine:latest
               16.          Essential: true
        }
      }
      Check =  User not EQUALS  "/root/" {
        Message = Container in the ECS task definition denied `User` that includes 'root'
        RequiredPropertyError {
          PropertyPath = /Resources/AmbiguousUser/Properties/ContainerDefinitions/0[L:13,C:10]
          MissingProperty = User
          Reason = Could not find key User inside struct at path /Resources/AmbiguousUser/Properties/ContainerDefinitions/0[L:13,C:10]
          Code:
               11.      Cpu: 256
               12.      Memory: 128
               13.      ContainerDefinitions:
               14.        - Name: alpine
               15.          Image: public.ecr.aws/docker/library/alpine:latest
               16.          Essential: true
        }
      }
    }
  }
}
Resource = RootViaUserName {
  Type      = AWS::ECS::TaskDefinition
  Rule = tasks_denied_root {
    ALL {
      Check =  User not EQUALS  "/root/" {
        ComparisonError {
          Message          = Container in the ECS task definition denied `User` that includes 'root'
          Error            = Check was not compliant as property value [Path=/Resources/RootViaUserName/Properties/ContainerDefinitions/0/User[L:41,C:16] Value="root"] equal to value [Path=[L:0,C:0] Value="/root/"].
          PropertyPath    = /Resources/RootViaUserName/Properties/ContainerDefinitions/0/User[L:41,C:16]
          Operator        = NOT EQUAL
          Value           = "root"
          ComparedWith    = "/root/"
          Code:
               39.        - Name: alpine
               40.          Image: public.ecr.aws/docker/library/alpine:latest
               41.          Essential: true
               42.          User: 'root'
               43.
               44.  # Runs as root via the group name

        }
      }
    }
  }
}
Resource = RootViaGroup {
  Type      = AWS::ECS::TaskDefinition
  Rule = tasks_denied_root {
    ALL {
      Check =  User not EQUALS  "/root/" {
        ComparisonError {
          Message          = Container in the ECS task definition denied `User` that includes 'root'
          Error            = Check was not compliant as property value [Path=/Resources/RootViaGroup/Properties/ContainerDefinitions/0/User[L:54,C:16] Value="bin:root"] equal to value [Path=[L:0,C:0] Value="/root/"].
          PropertyPath    = /Resources/RootViaGroup/Properties/ContainerDefinitions/0/User[L:54,C:16]
          Operator        = NOT EQUAL
          Value           = "bin:root"
          ComparedWith    = "/root/"
          Code:
               52.        - Name: alpine
               53.          Image: public.ecr.aws/docker/library/alpine:latest
               54.          Essential: true
               55.          User: 'bin:root'

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
- [Deny Linux kernel capabilities for Amazon ECS and AWS Fargate tasks](deny-kernel-capabilities-ecs-fargate-task)