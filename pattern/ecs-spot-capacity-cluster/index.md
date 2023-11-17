---
title: Amazon ECS cluster with EC2 Spot Capacity
description: >-
  CloudFormation template that demonstrates setting up an EC2 Spot capacity provider
  to supply compute for containers in the cluster
filterDimensions:
  - key: tool
    value: cloudformation
  - key: tool
    value: aws-sam-cli
  - key: type
    value: pattern
  - key: capacity
    value: ec2
  - key: feature
    value: capacity-provider
authors:
  - peckn
date: April 17 2023
---

#### About

[EC2 Spot Capacity](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html) is spare EC2 capacity that is available for less than the On-Demand price. Because Spot Instances enable you to request unused EC2 instances at steep discounts, you can lower your Amazon EC2 costs significantly. The hourly price for a Spot Instance is called a Spot price. The Spot price of each instance type in each Availability Zone is set by Amazon EC2, and is adjusted gradually based on the long-term supply of and demand for Spot Instances. Your Spot Instance runs whenever capacity is available.

Spot Capacity can be interrupted at any time. Therefore you need to be careful about what types of applications you run on Spot capacity and how you run those application. Amazon ECS is ideal if you want a more stable way to run workloads on top of interruptible Spot Capacity.

#### Install SAM CLI

This pattern uses AWS SAM CLI for deploying CloudFormation stacks on your account.
You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

#### Cluster Template

This cluster template demonstrates how to configure an autoscaling group to launch spot capacity
with mixed types. A variety of EC2 instances of different sizes will be launched.
However, Amazon ECS can gracefully handle this and adjust container density on each individual instance to match the size of that instance.

<<< files/spot-cluster.yml

A couple important things to note in this template:

- `ContainerInstances.Properties.UserData` - The `ecs.config` file set configuration that
  is used by the ECS agent. In addition to the basic info of which cluster to join, this template
  also sets up automatic task draining whenever a Spot termination notice is sent to the instance.
  It also modifies the stop timeout period to 90 seconds, so as to be less than the Spot termination window.
- `ECSAutoScalingGroup.Properites.MixedInstancesPolicy` - This autoscaling group policy allows the
  launch of mixed EC2 types, entirely on Spot, with no on-demand instances.

This template requires two input parameters:

- `VpcId` - The ID of a VPC on your AWS account. This can be the default VPC
- `SubnetIds` - A comma separated list of subnet ID's within that VPC

Additionally you can modify the following parameters:

- `DesiredCapacity` - Number of EC2 instances to start with. Default `0`
- `MaxSize` - An upper limit on number of EC2 instances to scale up to. Default `100`
- `ECSAMI` - The Amazon Machine Image to use for each EC2 instance. Don't change this unless you really know what you are doing.

#### Service Template

This template deploys an ECS service that uses the Spot capacity provider. ECS will automatically
adapt to launch as many mixed EC2 instances as necessary to host the service tasks.

<<< files/service.yml

Most parameters in this stack will be supplied by a parent stack that passes in
resources from the capacity provider stack. However you may be interested
in overriding the following parameters:

- `ServiceName` - A human name for the service.
- `ImageUrl` - URL of a container image to run. By default this stack deploys `public.ecr.aws/docker/library/busybox:latest`
- `ContainerCpu` - CPU shares, where 1024 CPU is 1 vCPU. Default: `256` (1/4th vCPU)
- `ContainerMemory` - Megabytes of memory to give the conatiner. Default `512`
- `Command` - Command to run in the container. Default: `sleep 3600`
- `DesiredCount` - Number of copies of the container to run. Default: `0` (So you can test scaling up from zero)

#### Parent Stack

This stack deploys both stacks as nested stacks, for ease of grouping and
passing parameters from one stack to the next.

<<< files/parent.yml

This parent stack requires the following parameters:

- `VpcId` - The ID of a VPC on your AWS account. This can be the default VPC
- `SubnetIds` - A comma separated list of subnet ID's within that VPC

#### Usage

First deploy the cluster and spot capacity autoscaling group:

```sh
sam deploy \
  --template-file parent.yml \
  --stack-name spot-capacity-provider-environment \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides VpcId=vpc-79508710 SubnetIds=subnet-b4676dfe,subnet-c71ebfae
```

#### Test it out

The service is initially deployed with a desired count of `0`. Use the Amazon ECS console to update the service and scale it up to a larger number of tasks. After an initial delay you will observe the ECS Capacity Provider request instances from the autoscaling group. The autoscaling group will fullfil the request by launching a mixture of EC2 instances based on current Spot market availability and pricing. As the instances join the ECS cluster they will be filled with service tasks.

#### See Also

- If you prefer to explictly choose on-demand EC2 instances to run then check out the [ECS EC2 Capacity Provider pattern](/ecs-ec2-capacity-provider-scaling).