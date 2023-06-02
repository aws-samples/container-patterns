---
title: Use target tracking to scale container deployments with Amazon ECS
description: >-
  Create a target tracking scaling policy with CloudFormation, to scale a service
  based on resource utilization.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
authors:
  - peckn
date: May 10, 2023
---

#### About

[AWS Application Auto Scaling](https://aws.amazon.com/autoscaling/) implements automated scaling policies and rules across many AWS services, including Amazon ECS.

Target tracking is a scaling mode in which Application Auto Scaling automatically learns how to adjust your scale to meet your expectation that a target metric will stay at a specified target. Target tracking works best with larger services, where there is a linear relationship between scaling and metrics.

#### Architecture

This is how auto scaling works:

!!! @/pattern/scale-ecs-service-cloudformation/architecture.svg

1. Your application container uses CPU, memory, and other computing resources
2. An ECS agent running on the same EC2 instance or AWS Fargate task gathers telemetry from your application container's usage statistics
3. Telemetry is stored in AWS CloudWatch metrics
4. AWS Application Auto Scaling triggers scaling rules based on CloudWatch metrics
4. Amazon ECS receives an `UpdateService` call from AWS Application Auto Scaling, which adjusts the desired count for the service
4. Amazon ECS launches additional copies of your application container on EC2 or AWS Fargate, or scales in the service to reduce the number of copies of your application, when there is no utilization.

#### CloudFormation Template

The following template automatically sets up CloudWatch alarms, auto scaling policies, and attaches them to an ECS service.

<<< @/pattern/target-tracking-scale-ecs-service-cloudformation/files/target-tracking-scale.yml

The template requires the following input parameters:

- `ClusterName` - The name of the ECS cluster that runs the service you would like to scale
- `ServiceName` - The name of the service you want to scale

Things to note in this template:

`ScalingPolicy.Properties.TargetTrackingScalingPolicyConfiguration` - This controls the metric to base scaling off of, and what target utilization to try to maintain.

There are two valid ECS specific values for `PredefinedMetricType`:
  * `ECSServiceAverageCPUUtilization` - Monitor the CPU utilization
  * `ECSServiceAverageMemoryUtilization` - Monitor the memory utilization

::: warning
Be careful about scaling based on memory utilization because with most application runtime frameworks memory is not correlated with utilization. Most applications don't release memory after load decreases. Instead they keep memory allocated in case they need to use it again. For this reason average memory utilization does not work with target tracking scaling because there is not a linear relationship between load and memory utilization.
:::

#### Usage

You can deploy the template via the AWS CloudFormation web console, or by running an AWS CLI command similar to this:

```shell
aws cloudformation deploy \
   --stack-name scale-my-service-name \
   --template-file target-tracking-scale.yml \
   --capabilities CAPABILITY_IAM \
   --parameter-overrides ClusterName=development ServiceName=my-web-service
```

#### Cleanup

You can delete the auto scaling configuration by tearing down the CloudFormation stack with:

```shell
aws cloudformation delete-stack --stack-name scale-my-service-name
```

#### See Also

- If you are running a smaller service, or want to have more precise control over how your service scales in response to load then consider [setting up a step scaling policy](/scale-ecs-service-cloudformation).