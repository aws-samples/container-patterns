---
title: Low cost AWS VPC for an Amazon ECS cluster
description: >-
  Deploy a low cost VPC, with public subnets only.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
authors:
  - peckn
date: May 11 2023
---

#### About

[Amazon Virtual Private Cloud (Amazon VPC)](https://aws.amazon.com/vpc/) gives you full control over your virtual networking environment, including resource placement, connectivity, and security.

The ideal way to configure a VPC is to use both public and private subnets. The public subnets are used for hosting internet facing resources like load balancers, while the private subnets are used to host application containers and other private resources.

However, private subnets need a NAT gateway for internet access, and NAT gateways comes with both an hourly fee, as well as an additional charge per GB of data that goes through the NAT gateway.

For this reason you may prefer to use a VPC that has exclusively public subnets. You can always upgrade to add NAT gateways and private subnets later on.

#### Architecture

The following diagram shows the architecture of what will be created:

!!! @/pattern/low-cost-vpc-amazon-ecs-cluster/diagram.svg

* The VPC that is created spans two availability zones. This gives you increased availability.
* Each AZ has a single public subnet. Internet traffic originating from these subnets goes directly to the internet gateway.

::: info
This low cost architecture is designed for very small deployments, as each resource launched into the public subnet must have a public IPv4 address assigned to it in order to actually use the internet gateway.

As of February 1, 2024 all public IPv4 addresses on your AWS account are billed. Large deployments that would require many public IPv4 addresses should migrate to a more complex but cost efficient architecture that utilizes private subnets and private IP addresses. See the following two options:

* ["Large sized AWS VPC for an Amazon ECS cluster"](large-vpc-for-amazon-ecs-cluster)
* ["Amazon ECS cluster with isolated VPC and no NAT Gateway"](ecs-cluster-isolated-vpc-no-nat-gateway)
:::

#### Subnet Compatibility

For this example VPC the following table shows subnet support for internet access and networking across each capacity and networking mode.

| Configuration |  Public Subnets  |
| ---------------- | ------------------------ |
| EC2 Bridge mode  | ✅  |
| EC2 Host mode  | ✅ |
| EC2 AWS VPC | ❌ (not supported, EC2 tasks don't have public IP's) |
| Fargate AWS VPC | ❗ (requires assign public IP) |

::: danger
AWS VPC on EC2 will not work in this VPC because task ENI's on EC2 can not be assigned public IP addresses, and therefore the task can not utilize the internet gateway.
:::

::: warning
AWS Fargate tasks must be launched with "assign public IP" turned on. This allows them to use the internet gateway directly. But if you don't turn on public IP assignment then internet access will not work.
:::

#### VPC Configuration

Deploy the following CloudFormation template to create the VPC:

<<< files/vpc.yml

Some things to note:

This pattern VPC has two public subnets, each with `16,384` addresses. These subnets should be used to hosting public facing load balancers, or other similar resources that are intended to accept direct inbound traffic from the internet.

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

#### Next Steps

- This template only provisions two subnets. For even greater availability consider adding a third public subnet.
- If you wish to utilize AWS VPC networking mode on EC2 or just want to run your application containers in a private subnet then considering upgrading to the [large VPC for Amazon ECS cluster](/large-vpc-for-amazon-ecs-cluster).