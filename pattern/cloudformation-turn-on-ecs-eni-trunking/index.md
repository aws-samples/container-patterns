---
title: Enable ENI trunking for Amazon ECS, using a CloudFormation custom resource
description: >-
  CloudFormation custom resource that adjusts the ENI trunking setting for the
  EC2 role of Amazon ECS hosts.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: capacity
    value: ec2
authors:
  - peckn
date: Jan 25, 2024
---

#### Terminology and Background

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) is an orchestrator that launches and manages application containers on your behalf. It deploys fleets of application containers as tasks across a wide range of compute capacity types, including [Amazon EC2](https://aws.amazon.com/ec2/).

[Amazon Virtual Private Cloud (VPC)](https://aws.amazon.com/vpc/) is how you launch AWS resources in a logically isolated virtual network.

An [elastic network interface (ENI)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html) is a logical networking component in a VPC that represents a virtual network card. Multiple ENI's can be attached to a single Amazon EC2 instance, so that the EC2 instance can have multiple IP addresses in a VPC.

ECS integrates with VPC so that you can give each ECS task it's own IP address in a VPC. When you enable [`awsvpc` networking mode](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking-awsvpc.html) ECS automatically provisions ENI's for your containers, and attaches these ENI's to EC2 instances that are hosting your application containers.

This pattern will demonstrate how to extend the capabilities of `awsvpc` networking mode by additionally enabling [ENI trunking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-instance-eni.html) for `awsvpc` networking mode.

To make the solution repeatable and reusable, you will deploy the ENI trunking setting using an [AWS CloudFormation](https://aws.amazon.com/cloudformation/) custom resource.

#### Why?

In `awsvpc` networking mode, each of your application containers gets it's own unique ENI. However, there is a limit on how many ENI's can be attached to an EC2 instance. This means that there is a limit on how many container tasks ECS can launch on an EC2 instance. Depending on the size of your ECS task this may prevent you from acheiving enough task density to efficiently make use of the available CPU and memory capacity of the EC2 instance.

ENI trunking dramatically increases the number of container tasks ECS can launch per EC2 instance. In ENI trunking mode only two ENI's are consumed per EC2 host. One ENI is used by the EC2 host itself, and one trunk ENI is shared by all containers on the host. You can find a [comparison table of task density per EC2 host with and without ENI trunking, in the ENI trunking documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-instance-eni.html#eni-trunking-supported-instance-types).

The ENI trunking setting can be a bit challenging to turn on, because it must be set by either the root account, or by the IAM role of the EC2 instances that will have the ENI trunking enabled. Therefore, in order to control the setting through CloudFormation it is necessary to use a CloudFormation custom resource.

#### Architecture

The following diagram illustrates how this custom resource solution works:

!!! @/pattern/cloudformation-turn-on-ecs-eni-trunking/diagram.svg

- An AWS Lambda function is used to power a CloudFormation custom resource that can update the ECS settings for an IAM role.
- Two IAM roles are created:
  1. `EC2Role` - A role for EC2 instances to use when joining an ECS cluster
  2. `CustomEniTrunkingRole` - A role for the Lambda function to use
- `CustomEniTrunkingRole` is granted the ability to assume `EC2Role`. This allows the Lambda function to assume the EC2 instance's role.
- `EC2Role` is granted the ability to call the ECS `PutAccountSetting` API.
- When the CloudFormation stack is deployed, the Lambda function that powers the custom resource uses it's `CustomEniTrunkingRole` to assume `EC2Role`. Then it uses the `EC2Role` to call the ECS `PutAccountSetting` API to turn on ENI trunking.
- Later when an EC2 instance bearing the `EC2Role` gets launched, it will automatically enable ENI trunking on itself, and begin assigning `awsvpc` container ENI's on a shared trunk ENI.

#### Custom Resource

The following CloudFormation template deploys the ENI trunking setting for an IAM role that could be used by EC2 instances joining an ECS cluster:

<<< files/eni-trunking.yml

#### Usage Instructions

Deploy the given CloudFormation template using a command similar to this:

```sh
aws cloudformation deploy \
  --stack-name eni-trunking \
  --template-file eni-trunking.yml \
  --capabilities CAPABILITY_IAM
```

Retrieve the name of the EC2 role that was created:

```sh
EC2_ROLE=$(aws cloudformation describe-stacks --stack-name eni-trunking --query "Stacks[0].Outputs[?OutputKey=='EC2Role'].OutputValue" --output text) && echo $EC2_ROLE
```

You can now update your ECS cluster instances to use this IAM role. On boot, the ENI trunking feature will be enabled for any EC2 instances that assigned this IAM role.

:::warning
You will need to launch new EC2 instances for this setting to take effect. Any previously existing EC2 instances registered to ECS will remain as they were. Also see the list of [ENI trunking considerations](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-instance-eni.html#eni-trunking-considerations) in the official docs.
:::

For an example of ENI trunking in action as part of an end to end ECS deployment, see the pattern: ["Amazon ECS Capacity Providers for EC2 instances"](ecs-ec2-capacity-provider-scaling)