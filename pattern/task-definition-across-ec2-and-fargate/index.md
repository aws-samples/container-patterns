---
title: Amazon ECS task definition across both EC2 and AWS Fargate
description: >-
  How to make a task definition that can deploy the same container
  either as a serverless application on AWS Fargate or hosted on
  EC2 instance capacity
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: capacity
    value: ec2
  - key: capacity
    value: fargate
authors:
  - peckn
date: Apr 14, 2023
---

#### About

One of the convenient features of Amazon ECS is that it is agnostic when
it comes to capacity type. You can create an ECS task definition that deploys
to both AWS Fargate and Amazon EC2 instances at the same time.

This pattern shows the key parts of the task definition that make this possible.

#### CloudFormation template

The following template creates a task definition that is compatible across both ECS on EC2 and ECS on AWS Fargate. It then deploys the task definition on both capacity types.

Note the following settings, which enable cross compatability in the task definition:

  * `RequiresCompatibilities` - This is set to an array that has both `EC2` and `FARGATE`
  * `NetworkMode` - In order to be compatible across both EC2 and Fargate the only valid value is `awsvpc`
  * `Cpu` and `Memory` - The requested task size much match a valid AWS Fargate task size


<<< files/task-definition.yml

This template requires the following parameters:

- `Cluster` - The name of an ECS cluster on this account. This cluster should have EC2 capacity available in it. All ECS clusters come with AWS Fargate support already built-in. For an example of how to deploy an ECS cluster with EC2 capacity there is a pattern for [an ECS cluster using a EC2 capacity provider](/ecs-ec2-capacity-provider-scaling).
- `Ec2CapacityProvider` - The name of an EC2 capacity provider on this cluster. Again see the [ECS cluster with EC2 capacity provider pattern](/ecs-ec2-capacity-provider-scaling).
- `VpcId` - A virtual private cloud ID. This can be the default VPC that comes with your AWS account. Example: `vpc-79508710`
- `SubnetIds` - A comma separated list of subnets from the VPC. Example: `subnet-b4676dfe,subnet-c71ebfae`

#### Usage

Deploy this template with a command like this:

```sh
aws cloudformation deploy \
  --template-file task-definition.yml \
  --stack-name task-across-ec2-and-fargate \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
     Cluster=capacity-provider-environment-BaseStack-18PANC6K9E7D8-ECSCluster-NNBNpIh5AkZO \
     Ec2CapacityProvider=capacity-provider-environment-BaseStack-18PANC6K9E7D8-CapacityProvider-FI323ISAaRbn \
     VpcId=vpc-79508710 \
     SubnetIds=subnet-b4676dfe,subnet-c71ebfae
```

#### JSON task definition

If you prefer to create the ECS task definition using JSON, then this snippet
is a minimal example of the properties necessary for a task definition to be compatible across both AWS Fargate and Amazon EC2:

<<< files/task-definition.json

Register this task definition using the following command:

```sh
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```