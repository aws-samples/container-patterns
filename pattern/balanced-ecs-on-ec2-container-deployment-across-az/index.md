---
title: Evenly balance an ECS deployment across availability zones
description: >-
  How to use a capacity provider strategy to guarantee that containers are always evenly rebalanced across AZ's.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: capacity
    value: ec2
authors:
  - peckn
date: Jan 16, 2024
---

#### About

[Amazon Elastic Container Service](https://aws.amazon.com/ecs/) is a serverless orchestrator that manages container deployments on your behalf.

Capacity providers are a built-in feature of Amazon ECS. A capacity provider launches Amazon EC2 capacity automatically when you need capacity to run containers on AWS.

This reference architecture shows how to use a set of single zone capacity providers, and a capacity provider strategy to evenly distribute container tasks across multiple availability zones.

#### Why?

Amazon ECS comes with default placement strategies. In specific you can use the `spread(attribute:ecs.availability-zone)` to attempt to distribute containers evenly across availability zones. However, task placement strategies are a best effort. Amazon ECS still attempts to place tasks even when the most optimal placement option is unavailable.

This means that in some circumstances Amazon ECS may choose to place an excessive number of tasks into one or two AZ's. The following diagrams shows one scenario in which this may occur.

Imagine a cluster of three instances distributed across three availability zones. Each instance has capacity to run four tasks:

!!! @/pattern/balanced-ecs-on-ec2-container-deployment-across-az/empty.svg

Now you launch a service which deploys four copies of container A, distributed across availability zones:

!!! @/pattern/balanced-ecs-on-ec2-container-deployment-across-az/container-a.svg

Because there is one more task than there are availability zones and instances, the first AZ gets two tasks instead of one.

Now you deploy a second service, which also deploys four tasks:

!!! @/pattern/balanced-ecs-on-ec2-container-deployment-across-az/container-b.svg

Once again the first instance in the first AZ gets two tasks instead of one task. It is now full of tasks and can not host any additional tasks.

Once again you deploy a third service, which also deploys four tasks:

!!! @/pattern/balanced-ecs-on-ec2-container-deployment-across-az/container-c.svg

This time the only instances that still have capacity are the two instances in the second and third availability zone. As a result these two instances each get two tasks.

The problem is that this third service is not distributed across all availability zones. If the workload has a high availability requirement to be distributed across three availability zones, then it is now more vulnerable to availability zone outages.

This is not the only scenario in which ECS tasks may end up unbalanced. Rolling deployments and scaling up may also choose to make denser usage of the currently available capacity rather than launching additional instances. This results in a deployment that is excessively concentrated into a single availability zone or two availability zones.

In general, this problem gets less serious with larger services that have more desired count, and with an increased number of availability zones.

#### Architecture

The following diagram shows how this reference architecture solves for even task balancing across availability zones:

!!! @/pattern/balanced-ecs-on-ec2-container-deployment-across-az/three-az.svg

1) Instead of one large autoscaling group that spans all three availability zones, there is a separate autoscaling group for each availability zone.
2) Each autoscaling group is linked to an ECS capacity provider.
3) An ECS capacity provider strategy is configured to distribute tasks evenly across the three capacity providers.
4) Each capacity provider then manages the capacity for that single zone, allowing zones to scale to a larger size if necessary to maintain a distributed task placement.

In the above example all three services have been placed across all three availability zones. This has been accomplished by scaling up the first AZ to a larger size, while keeping some wasted space on the other two AZ's. As a result there is one entire instance of wasted compute capacity, but all three services are distributed across all three AZ's.

:::warning
This approach will deliberately waste EC2 capacity in order to evenly distribute tasks across availability zones. This capacity provider strategy is not optimized for cost. It is optimized for high availability.
:::

#### Deploy

```sh
# Get the VPC ID of the default VPC on the AWS account
DEFAULT_VPC_ID=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)

# Grab the list of subnet ID's from the default VPC, and glue it together into a comma separated list
DEFAULT_VPC_SUBNET_IDS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$DEFAULT_VPC_ID --query "Subnets[*].[SubnetId]" --output text | paste -sd, -)

# Now deploy the ECS cluster to the default VPC and it's subnets
sam deploy \
  --template-file parent.yml \
  --stack-name capacity-provider-environment \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides VpcId=$DEFAULT_VPC_ID SubnetIds=$DEFAULT_VPC_SUBNET_IDS
```