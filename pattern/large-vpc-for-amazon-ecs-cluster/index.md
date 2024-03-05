---
title: Large sized AWS VPC for an Amazon ECS cluster
description: >-
  Reusable CloudFormation pattern for deploying a large VPC capable of hosting
  thousands of container tasks, with internet access.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
authors:
  - peckn
date: May 2 2023
---

#### About

[Amazon Virtual Private Cloud (Amazon VPC)](https://aws.amazon.com/vpc/) gives you full control over your virtual networking environment, including resource placement, connectivity, and security.

The recommended way to configure networking for containers in a Amazon ECS cluster is using VPC networking mode. In this mode ECS gives each task that you start it's own unique private IP address in your VPC. There are significant benefits to this, such as the ability to give your tasks VPC security groups that allow you granular control over container to container communication, even when tasks are running colocated on the same EC2 instance. Additionally, when deploying containers using AWS Fargate you are required to use the VPC networking mode.

One challenge of deploying containers in VPC networking mode is that you must provision a large enough VPC to hold all your containers. Otherwise when you attempt to scale up you will run out of IP address space in the VPC and network interface provisioning will fail.

Additionally, containers that run in VPC mode on EC2 will only be given private IP addresses. Therefore the VPC requires additional networking configuration to for containerized tasks to be able to communicate with the public internet.

This pattern creates a large VPC with room to host tens of thousands of containers on AWS Fargate or EC2 instances. It also configures the VPC with NAT gateways for the private subents to ensure that you have full outbound internet access in all subnets of the VPC.

#### Architecture

The following diagram shows the architecture of what will be created:

!!! @/pattern/large-vpc-for-amazon-ecs-cluster/diagram.svg

* The VPC that is created spans two availability zones. This gives you increased availability.
* Each AZ gets a public subnet and a private subnet.
* The VPC has an internet gateway that can be used from the public subnets by any container or compute that has a public IP address.
* This pattern creates two NAT gateways that provide internet access to resources launching in the private subnets.

::: info
If you would prefer a fully isolated VPC, with no inbound or outbound internet access, you should use the VPC pattern ["Amazon ECS cluster with isolated VPC and no NAT Gateway"](ecs-cluster-isolated-vpc-no-nat-gateway). This alternative pattern utilizes AWS PrivateLink endpoints to provide secure access to the AWS services that are required for Amazon ECS functionality.
:::

#### Subnet Compatibility

For this example VPC the following table shows subnet support for internet access and networking across each capacity and networking mode.

| Configuration |     Private Subnets      |  Public Subnets    |
| ---------------- | ------------------------ | ------------------ |
| EC2 Bridge mode  | ✅      | ✅  |
| EC2 Host mode  | ✅       | ✅  |
| EC2 AWS VPC | ✅        |  ❌ (not supported, EC2 tasks don't have public IP's)  |
| Fargate AWS VPC | ✅  | ❗ (requires assign public IP) |

::: danger
Note that when using AWS VPC networking mode on EC2 it is not supported to place tasks in the public subnet, because the task ENI only has a private IP address. In the public subnet outbound networking traffic will go directly to the internet gateway, however because the task has no public IP address there is no return path to the task.
:::

::: warning
AWS Fargate tasks can be launched with "assign public IP" turned on. This allows tasks to be launched in a public subnet and use the internet gateway directly. But if you don't turn on public IP assignment then internet access will not work properly.
:::

#### VPC Configuration

Deploy the following CloudFormation template to create the VPC:

<<< files/vpc.yml

Some things to note:

This pattern VPC has two public subnets, each with `16,384` addresses. These subnets should be used to hosting public facing load balancers, or other similar resources that are intended to accept direct inbound traffic from the internet.

This pattern VPC has two private subnets, each with `16,384` addresses. These subnets should host the underlying EC2 instances and containers that you wish to protect from direct internet access. All of their outbound internet communications will be proxied through two NAT gateways that are hosted in the public subnets.

[Amazon Virtual Private Cloud reserves the first four IP addresses and the last IP address in each subnet CIDR block](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html) for it's own use. The other `65,516` IP addresses in the VPC are available for your containers and/or EC2 instances.

If you are planning to run an incredibly large workload then keep an eye on the [Network Address Usage (NAU) metric and quota](https://docs.aws.amazon.com/vpc/latest/userguide/network-address-usage.html) for your AWS account. You may need to request an increase to your NAU quota.

#### Usage

Deploy the template via the AWS CloudFormation console, or with a CLI command like this:

```shell
aws cloudformation deploy \
   --stack-name big-vpc \
   --template-file vpc.yml
```

The deployed template has `Outputs` that you can pass into other stacks:

- `VpcId` - Many other AWS resources will need to know the ID of the VPC that they are placed in.
- `PublicSubnetIds` - A comma separated list of the subnet ID's that have direct internet access.
- `PrivateSubnetIds` - A comma separates list of the subnet ID's that have internet access via a NAT gateway.

#### Next Steps

- This template only provisions two subnets. For even greater availability consider adding a third public and private subnet and NAT gateway.
- If your private subnet hosted resources make heavy use of AWS services such as DynamoDB, S3, or other services, then consider adding VPC endpoints for those services. This will remove the need for that traffic to go through the NAT gateway, freeing up it's capacity for other usage, and potentially reducing your networking costs.
- If this VPC still looks too small for your workload then consider splitting it up across multiple smaller VPC's.
- If you do not wish to pay for NAT gateways then consider the [low cost VPC for Amazon ECS](/low-cost-vpc-amazon-ecs-cluster). Note that this VPC choice does limit your capabilities when running on EC2 instances, although you can still use AWS Fargate capacity without NAT gateway.