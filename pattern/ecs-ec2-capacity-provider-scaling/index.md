---
title: Amazon ECS Capacity Provider for EC2 instances
description: >-
  Production ready pattern for scaling EC2 capacity in an ECS cluster
  using an ECS Capacity Provider
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
date: Feb 1 2024
---

#### Terminology and Background

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) is container orchestrator that deploy containerized applications to both [Amazon EC2](https://aws.amazon.com/ec2/) capacity as well as serverless [AWS Fargate](https://aws.amazon.com/fargate/) capacity.

[Amazon ECS capacity providers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-capacity-providers.html) are a built-in feature that helps you launch EC2 capacity on fly. When application containers need to run, the capacity provider provisions as many EC2 hosts as necessary. When all containers are done running, the cluster can "scale to zero" by shutting down all EC2 hosts.

This pattern shows a production ready ECS on EC2 capacity provider configuration. It comes with a variety of helpful, out of the box configurations and failsafes to keep your ECS on EC2 cluster resilient.

#### Architecture Diagrams

The following diagrams show what this pattern will deploy:

!!! @/pattern/ecs-ec2-capacity-provider-scaling/architecture.svg

By following the instructions here, you will deploy:

1. A group of EC2 instances launched by an EC2 Auto Scaling Group, spread across availability zones
2. Each EC2 instance hosts a lightweight (<10 MB memory) daemon task used for health verification
3. Each EC2 instance can host multiple application containers. This allows you to save on infrastructure costs and acheive better utilization of your EC2 instances, by running more instances of your application per host instance.

The runtime aspects of the architecture are orchestrated by Amazon Elastic Container Service in the following manner:

!!! @/pattern/ecs-ec2-capacity-provider-scaling/ecs-service-placement.svg

* Amazon ECS manages the size of the Auto Scaling Group, and automatically scales it to the appropriate size to match the number of application containers you want to run
* A [`DAEMON` type service](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html) is used to automatically launch one copy of the health verification task onto each instance when it joins the ECS cluster.
* A `REPLICA` type service is used to decide how many EC2 instances to scale up to. The service's application container is distributed across the instances.

This architecture also comes with operational enhancements designed to make it easier and safer to manage the EC2 instances that are used as container capacity:

!!! @/pattern/ecs-ec2-capacity-provider-scaling/asg-rolling-update.svg

* The CloudFormation template [uses a dynamic SSM parameter to determine what ECS Optimized AMI to deploy](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/retrieve-ecs-optimized_AMI.html). This parameter ensures that each time you deploy the stack it will check to see if there is available update that needs to be applied to the EC2 instances.
* The Auto Scaling Group is configured to monitor [CloudFormation signals](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-signal.html) when applying a rolling AMI update to the EC2 instances.
* Each EC2 instance runs a [CloudFormation initialization](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-init.html) script that verifies that the host is actually able to connect to the ECS control plane and launch a health daemon task. Only once the EC2 instance is successfully registered with ECS, and has launched the health check task, then the CloudFormation signal is used to notify the Auto Scaling Group that the host is healthy.
* In the event that an configuration or AMI update does not function, this configuration will automatically rollback the stack to the previous EC2 configuration. This gives you a safe way to continuously roll out updates to the ECS AMI on a regular basis.

#### Dependencies

This pattern uses AWS SAM CLI for deploying CloudFormation stacks on your account.
You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

#### Cluster with EC2 Capacity Provider

Download the following `cluster-capacity-provider.yml` file, which deploys an ECS cluster that has a capacity provider linked to an EC2 Autoscaling Group. The Autoscaling Group starts out scaled to zero, empty of EC2 instances.

<<< files/cluster-capacity-provider.yml

This stack accepts the following parameters that can used to adjust its behavior:

- `InstanceType` - An ECS instance type. By default the stack deploys `c5.large`
- `MaxSize` - An upper limit on number of EC2 instances to scale up to. Default `100`
- `ECSAMI` - The Amazon Machine Image to use for each EC2 instance. Don't change this unless you really know what you are doing.
- `VpcId` - The VPC to launch EC2 instances in. Can be the default account VPC.
- `SubnetIds` - A comma separated list of subnets from that VPC.

A few things to look out for in this template:

- `CustomAsgDestroyerFunction` - This is a custom CloudFormation resource that helps clean up the Auto Scaling Group faster when tearing down the stack.
- `CustomEniTrunkingFunction` - This custom CloudFormation resource enables ENI trunking. See the ["ENI trunking for Amazon ECS" pattern](cloudformation-turn-on-ecs-eni-trunking) for more details
- `AWS::AutoScaling::AutoScalingGroup` -> `UpdatePolicy` - This configuration enables the Auto Scaling Group to automatically roll out updates whenever the ECS AMI is updated. The `WaitOnResourceSignals` setting is used to validate the EC2 instance health during rolling updates.
- `AWS::CloudFormation::Init` - This block of configuration defines commands that run on each EC2 instance after it launches. The commands use the [ECS agent introspection endpoint](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-introspection.html) to validate that the instance is able to connect to ECS and launch a task
- `HealthinessDaemon` - This is an ECS `DAEMON` type service that launches a lightweight container on each host that just sleeps forever. The existence of this container is used as an indication that the host has been able to successfully join the ECS cluster and launch an ECS task.

#### Service with a Capacity Provider Strategy

Download the following `service-capacity-provider.yml` file. This CloudFormation template deploys an ECS service into the cluster, with a
capacity provider strategy setup. The service will signal the capacity provider
to request capacity, and the capacity provider will scale up the EC2 Autoscaling Group automatically.

<<< files/service-capacity-provider.yml

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

Download the following `parent.yml` file. This stack deploys both of the previous stacks as nested stacks, for ease of grouping and passing parameters from one stack to the next.

<<< files/parent.yml

This parent stack requires the following parameters:

- `VpcId` - The ID of a VPC on your AWS account. This can be the default VPC
- `SubnetIds` - A comma separated list of subnet ID's within that VPC

#### Deploying the stacks with SAM

You should now have three files:

- `cluster-capacity-provider.yml` - Defines an ECS cluster with production ready operational enhancements
- `service-capacity-provider.yml` - Defines an ECS service that deploys into the cluster
- `parent.yml` - Parent file that deploys both of the previous files

Use SAM CLI to deploy everything with a command like this:

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

::: info
This sample command deploys the stack to the AWS account's pre-existing default VPC. You may wish to deploy the workload to a custom VPC, such as the ["Large sized VPC for an Amazon ECS cluster"](large-vpc-for-amazon-ecs-cluster).
:::

::: warning
Depending on what you choose to call your stack in the `stack-name` parameter, you may get an error in CloudFormation that looks like this:

```
CreateCapacityProvider error: The specified capacity provider name is invalid. Up to 255 characters are allowed, including letters (upper and lowercase), numbers, underscores, and hyphens. The name cannot be prefixed with "aws", "ecs", or "fargate". Specify a valid name and try again.
```

If this happens ensure that your parent CloudFormation stack's name does not start with "aws", "ecs", "fargate". The capacity provider in the stack gets an autogenerated name that is derived from the stack name, so if the stack starts with a prohibited word it will cause the capacity provider's name to also start with that prohibited word.
:::

#### Test scaling up from zero

Initially the ECS cluster will be empty, with no EC2 instances. Additionally
the deployed service has a `DesiredCount` of zero, so there are
initially no containers being launched either.

Use the Amazon ECS web console to update the service and set the desired count to a higher number of tasks. You will observe the ECS cluster launch the requested tasks into an initial status of `PROVISIONING`. At this point the task is just a virtual placeholder. The capacity provider notices the task waiting for capacity and responds by scaling up the autoscaling group to provide some EC2 capacity in the cluster. Finally, ECS places tasks onto this brand new capacity as it comes online.

#### Test rolling out an EC2 instance update

Whenever there is a new ECS Optimized AMI available the Auto Scaling Group will roll out the update as part of the next CloudFormation stack update. However, you can simulate an update by modifying the `AWS::EC2::LaunchTemplate`. Locate the `UserData` script that runs on each EC2 instance, and add a comment to it. For example:

```yaml
UserData:
  Fn::Base64: !Sub |
    #!/bin/bash -xe
    # added a test comment here so there is a change for CloudFormation to detect
    echo ECS_CLUSTER=${ECSCluster} >> /etc/ecs/ecs.config
    yum install -y aws-cfn-bootstrap
    /opt/aws/bin/cfn-init -v --stack ${AWS::StackId} --resource ContainerInstances --configsets full_install --region ${AWS::Region} &
```

Now the next time you deploy it will initiate a rolling update of the Auto Scaling Group to replace all the EC2 instances with new instances. You will see that the container workloads on old hosts are gracefully drained and replaced onto new EC2 hosts prior to the older EC2 hosts shutting down.

#### Test scaling back down to zero

Last but not least update the service in the ECS console to adjust its desired count back down to zero. Once all instances are empty you will see ECS begin to shutdown EC2 instances until the cluster has been scaled back down to zero.

#### Tear it Down

You can use the following command to tear down the test stack and all of it's created resources:

```sh
sam delete --stack-name capacity-provider-environment --no-prompts
```

#### See Also

- If your workload is interruptible you may prefer to save money on your infrastructure costs by using an [EC2 Spot Capacity provider](/ecs-spot-capacity-cluster) instead.
