---
title: Step scaling policy for ECS service based on CPU consumption
description: >-
  CloudFormation for automatically scaling an ECS service up and down based on CPU usage
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

Auto scaling is very important for ensuring that your services can stay online when traffic increases unexpectedly. In both EC2 and AWS Fargate you can configure Amazon ECS to automatically increase and decrease the number of copies of your application container that are running in the cluster.

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

<<< files/scale-service-by-cpu.yml

The template requires the following input parameters:

- `ClusterName` - The name of the ECS cluster that runs the service you would like to scale
- `ServiceName` - The name of the service you want to scale

Things to note in this template:

- `HighCpuUsageAlarm.Properties.MetricName` - The metric name to scale on. This is scaling based on CPU utilization.
- `HighCpuUsageAlarm.Properties.Threshold` - The CPU utilization threshold at which to start applying scaling policies. In this case it is set to 70% to provide some headroom for small deployments to absorb spikes of incoming traffic. The larger your service is the closer you can push this to 100%.
- `ScaleUpPolicy.Properties.StepScalingPolicyConfiguration` - This controls the behavior for how fast to scale up based on how far out on bounds the metric is. The more CPU goes above the target utiliation the faster ECS will launch additional tasks to try to bring the CPU utilization back in bounds.

::: tip
Note that this example CloudFormation template is scaling based on CPU Utilization. This is the correct way to scale for almost all application frameworks. Be careful about scaling based on memory utilization because with most application runtime frameworks memory is not correlated with utilization. Most applications don't release memory after load decreases. Instead they keep the memory allocated in case they need to use it again. So scaling on memory utilization may scale out but never scale back down.
:::

#### Usage

You can deploy the template via the AWS CloudFormation web console, or by running an AWS CLI command similar to this:

```shell
aws cloudformation deploy \
   --stack-name scale-my-service-name \
   --template-file scale-service-by-cpu.yml \
   --capabilities CAPABILITY_IAM \
   --parameter-overrides ClusterName=development ServiceName=my-web-service
```

#### Cleanup

You can delete the auto scaling configuration by tearing down the CloudFormation stack with:

```shell
aws cloudformation delete-stack --stack-name scale-my-service-name
```

#### See Also

- Consider [setting up a target tracking auto scaling rule](/target-tracking-scale-ecs-service-cloudformation) for your service if you want an even easier way to keep utilization near a specific target as your service scales up.