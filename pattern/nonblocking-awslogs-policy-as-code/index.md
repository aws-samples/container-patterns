---
title: Enforce non-blocking mode for awslogs logging driver, with CloudFormation Guard policy as code
description: >-
  Ensure that applications stay online, with limited log loss, by using CloudFormation Guard policy as code to enforce non-blocking logging mode.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: policy-as-code
authors:
  - peckn
date: Nov 13, 2023
---

#### About

[CloudFormation Guard](https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html) is a policy as code tool. It evaluates rules which enforce that your infrastructure as code adheres to your organization's desired policies.

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) is a container orchestration tool that helps you run your applications on AWS, and connect those applications to a variety of other AWS services.

One of the features of Amazon ECS is an integration with [Amazon CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html), provided by the [`awslogs` logging driver](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html).

This pattern is a reusable CloudFormation Guard policy as code rule that enforces that any `awslogs` logging driver configurations in your Amazon ECS infrastructure as code are set to a safe, non-blocking mode.

#### Why?

The `awslogs` logging driver takes log output from `stdout` and dispatches it to Amazon CloudWatch Logs in chunks. But what if it is unable to reach CloudWatch?

!!! @/pattern/nonblocking-awslogs-policy-as-code/blocking.svg

 In the case of a service outage, or networking issue, it is possible that the `awslogs` logging driver will be unable to dispatch a chunk of logs to Amazon CloudWatch. In the default `blocking` mode this means backpressure will build up and cause any further writes to `stdout` to hang until the logging driver is once again able to flush the logs to Amazon CloudWatch.

 Backpressure in blocking mode will result in your application freezing when it attempts to write logs to `stdout`. For example a web server that is unable to write access logs to `stdout` may freeze indefinitely and stop responding to incoming web requests.

!!! @/pattern/nonblocking-awslogs-policy-as-code/nonblocking.svg

In most cases it is undesirable for your application to freeze up because of logging related backpressure. This CloudFormation Guard rule enforces `non-blocking` mode, with a 25 MB ring buffer. If `awslogs` logging driver is unable to dispatch logs to CloudWatch it will accumulate logs in memory up to a limit of 25 MB. If that limit is reached it will begin dropping accumulated logs. However, your application will remain online and responsive.

::: warning
If you have an application in which having audit logs is more important than availability, then you should stick to the default `blocking` mode. However keep in mind that any loss of connectivity to Amazon CloudWatch will likely cause application side issues.

You can read more about `awslogs` behavior at ["Preventing log loss with non-blocking mode in the AWSLogs container log driver"](https://aws.amazon.com/blogs/containers/preventing-log-loss-with-non-blocking-mode-in-the-awslogs-container-log-driver/).
:::

#### Dependencies

<!--@include: @/parts/cloudformation-guard.md-->

#### CloudFormation Guard

The following CloudFormation Guard rule checks to ensure that `awslogs` logging driver is configured in `non-blocking` mode with a 25 MB ring buffer.

<<< ../../lint/guard/awslogs-logging-driver.guard

#### Evaluate Policy as Code

You can use the CloudFormation Guard rule with the following command:

```sh
cfn-guard validate --data ./path/to/**/your/cloudformation/*.yml --rules ./path/to/rules/folder
```

If the CloudFormation Guard finds a policy as code violation you will see output similar to this:

```txt
Evaluating data service.yml against rules awslogs-logging-driver.guard
Number of non-compliant resources 1
Resource = TaskDefinition {
  Type      = AWS::ECS::TaskDefinition
  Rule = awslogs_nonblocking_condition {
    ALL {
      Check =  Options.mode EQUALS  "non-blocking" {
        RequiredPropertyError {
          PropertyPath = /Resources/TaskDefinition/Properties/ContainerDefinitions/1/LogConfiguration/Options[L:81,C:14]
          MissingProperty = mode
          Reason = Could not find key mode inside struct at path /Resources/TaskDefinition/Properties/ContainerDefinitions/1/LogConfiguration/Options[L:81,C:14]
          Code:
               79.          LogConfiguration:
               80.            LogDriver: 'awslogs'
               81.            Options:
               82.              awslogs-group: !Ref AppLogGroup
               83.              awslogs-region: !Ref AWS::Region
               84.              awslogs-stream-prefix: !Sub "${ServiceName}/app"
        }
      }
      Check =  Options.max-buffer-size EQUALS  "25m" {
        RequiredPropertyError {
          PropertyPath = /Resources/TaskDefinition/Properties/ContainerDefinitions/1/LogConfiguration/Options[L:81,C:14]
          MissingProperty = max-buffer-size
          Reason = Could not find key max-buffer-size inside struct at path /Resources/TaskDefinition/Properties/ContainerDefinitions/1/LogConfiguration/Options[L:81,C:14]
          Code:
               79.          LogConfiguration:
               80.            LogDriver: 'awslogs'
               81.            Options:
               82.              awslogs-group: !Ref AppLogGroup
               83.              awslogs-region: !Ref AWS::Region
               84.              awslogs-stream-prefix: !Sub "${ServiceName}/app"
        }
      }
    }
  }
}
```

CloudFormation Guard will return a non zero exit code to indicate a failure. When included as part of a CI/CD pipeline, this will cause the release process to fail, thereby enforce that all `awslogs` logging driver configurations must use non-blocking mode.

#### See Also

- [Choosing container logging options to avoid backpressure](https://aws.amazon.com/blogs/containers/choosing-container-logging-options-to-avoid-backpressure/)
- [Preventing log loss with non-blocking mode in the AWSLogs container log driver](https://aws.amazon.com/blogs/containers/preventing-log-loss-with-non-blocking-mode-in-the-awslogs-container-log-driver/)

More policy as code patterns:

- [Enforce readonly root filesystem for containers in ECS, with CloudFormation Guard policy as code](enforce-read-only-root-filesystem-ecs-policy-as-code)
- [Deny privileged container mode in Amazon ECS with CloudFormation Guard policy as code](deny-privileged-container-ecs-policy-as-code)
- [Deny Linux kernel capabilities for Amazon ECS and AWS Fargate tasks](deny-kernel-capabilities-ecs-fargate-task)