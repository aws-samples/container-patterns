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

This reference architecture shows how to use a set of zonal capacity providers, and a capacity provider strategy to evenly distribute ECS tasks across multiple availability zones.

#### Why?

Amazon ECS comes with default placement strategies. In specific you can use the following strategy to tell Amazon ECS to distribute containers evenly across availability zone:

```txt
spread(attribute:ecs.availability-zone)
```

However, task placement strategies are a best effort. Amazon ECS still attempts to place tasks even when the most optimal placement option is unavailable.

This means that in some circumstances Amazon ECS may choose to place an excessive number of tasks into one or two AZ's. The following diagrams demonstrate one scenario in which this may occur.

Imagine a cluster of three instances distributed across three availability zones. Each instance has capacity to run four tasks:

!!! @/pattern/balanced-ecs-on-ec2-container-deployment-across-az/empty.svg

Now you launch service A which deploys four copies of container A, distributed across availability zones:

!!! @/pattern/balanced-ecs-on-ec2-container-deployment-across-az/container-a.svg

Because there is one more task than there are availability zones and instances, the first instance in the first AZ gets two tasks instead of one.

Now you deploy a second service B, which also deploys four copies of container B:

!!! @/pattern/balanced-ecs-on-ec2-container-deployment-across-az/container-b.svg

Once again the first instance in the first AZ gets two tasks instead of one task. That instance is now full of tasks and can not host any additional tasks.

Once again you deploy a third service C, which also deploys four copies of container C:

!!! @/pattern/balanced-ecs-on-ec2-container-deployment-across-az/container-c.svg

This time the only instances that still have capacity are the two instances in the second and third availability zone. As a result these two instances each get two tasks.

The problem is that this third service is not actually distributed across all availability zones. If the workload had a high availability requirement to be distributed across three availability zones, then this reduced availability distribution may not be acceptable.

This is not the only scenario in which ECS tasks may end up unbalanced. Rolling deployments and scaling up may also choose to make denser usage of the currently available capacity rather than launching additional instances. This results in a deployment that is excessively concentrated into a single availability zone or two availability zones. In a worst case all tasks for a service could end up placed onto capacity from a single AZ.

In general, this problem gets less serious with larger services that have more desired count, and with an increased number of availability zones. However, instead of relying on higher scale and chance, you can also utilize ECS capacity providers to even out task placement.

#### Architecture

The following diagram shows how this reference architecture solves for even task balancing across availability zones:

!!! @/pattern/balanced-ecs-on-ec2-container-deployment-across-az/three-az.svg

1) Instead of one large EC2 Auto Scaling group that spans all three availability zones, there is a separate EC2 Auto Scaling group for each availability zone.
2) Each Auto Scaling group is linked to it's own ECS capacity provider.
3) An ECS capacity provider strategy is configured to distribute tasks for the service evenly across the three capacity providers.
4) Each capacity provider then manages the capacity for it's own zone, allowing zones to indepdently scale to a larger size if necessary to maintain a distributed task placement.

In the above example all three services have been placed across all three availability zones. This has been accomplished by scaling up the first AZ to a larger size, while keeping some wasted space on the other two AZ's. As a result there is one entire instance of wasted compute capacity, but all three services are distributed across all three AZ's.

:::warning
This approach will deliberately waste EC2 capacity in order to evenly distribute tasks across availability zones. This capacity provider strategy is not optimized for cost. It is optimized for high availability.
:::

#### Dependencies

This pattern requires the following local dependencies:

* AWS SAM CLI for deploying CloudFormation stacks on your AWS account. You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

This architecture will be defined as a series of separate infrastructure as code modules that are linked together with a parent file that defines the application as a whole. Download each the following files. Instructions for deployment will follow.

#### Define the ECS cluster

This following `cluster.yml` file defines an ECS cluster, plus some supporting infrastructure that will be reused later on.

<<< files/cluster.yml

Things to look for:

* `CustomAsgDestroyerFunction` - This custom CloudFormation resource helps clean up the stack faster on tear down
* `CustomEniTrunkingFunction` - This custom CloudFormation resource [enables ENI trunking for the EC2 instances](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-instance-eni.html)

#### Define a single zonal capacity provider

<<< files/single-az-capacity-provider.yml

#### Define the capacity provider association

<<< files/capacity-provider-associations.yml

#### Define a service

<<< files/service-capacity-provider.yml

#### Put it all together

<<< files/parent.yml

#### Deploy

You should now have five files:

* `cluster.yml` - Define the ECS cluster and supporting infrastructure
* `single-az-capacity-provider.yml` - Define an Auto Scaling group and ECS capacity provider for a single zone
* `capacity-provider-associations.yml` - Links multiple capacity providers to the ECS cluster
* `service-capacity-provider.yml` - Defines a service distributed across three capacity providers
* `parent.yml` - Instantiates the other YAML files, including creating three copies of the zonal capacity provider

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