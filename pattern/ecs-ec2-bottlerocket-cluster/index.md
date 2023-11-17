---
title: Amazon ECS cluster on Bottlerocket Operating System
description: >-
  Launch an ECS cluster that uses Bottlerocket OS instances as
  capacity for running containers
filterDimensions:
  - key: tool
    value: cloudformation
  - key: tool
    value: aws-sam-cli
  - key: type
    value: pattern
  - key: capacity
    value: ec2
authors:
  - peckn
date: Jun 1, 2023
---

#### About

[Bottlerocket](https://bottlerocket.dev/) is a Linux-based open-source operating system that is purpose-built by Amazon Web Services for running containers. Bottlerocket is designed to have only the bare minimum of software required to run containers. Additionally, it is designed with additional security hardening and an upgrade mechanism designed to reduce the overhead of maintaining large clusters.

<youtube id='Y2cas2I-5bk' />

#### Dependencies

This pattern uses AWS SAM CLI for deploying CloudFormation stacks on your account.
You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

#### Grab a VPC template

To deploy this pattern you will use the [base pattern that defines a large VPC for an Amazon ECS cluster](/large-vpc-for-amazon-ecs-cluster). This will deploy the public and private subnets as well as the NAT gateway that provides internet access to the private subnets. Download the `vpc.yml` file from that pattern, but don't deploy it yet. You will deploy the VPC later as part of this pattern.

#### Define the cluster

We will use the following CloudFormation template to define a cluster that uses a capacity provider that launches Bottlerocket instances on Amazon EC2:

<<< files/cluster.yml

A few specific things to note in this template are:

The latest Bottlerocket Amazon Machine Image (AMI) id is retrieved from the SSM parameter `/aws/service/bottlerocket/aws-ecs-1/x86_64/latest/image_id`.

Bottlerocket uses [TOML](https://toml.io/en/) configuration format. You can specify which cluster to connect to using the following userdata config:

```toml
[settings.ecs]
cluster = "cluster name goes here"
```

Bottlerocket is designed to be run in a hardened mode that does not have any SSH access at all. Instead you use SSM to open a session to instance if you need to connect to it directly. Therefore the instance role is granted SSM permissions using the managed policy `AmazonSSMManagedInstanceCore`.

#### Deploy a service

The following template defines a service that uses the capacity provider to request Bottlerocket capacity to run on. Containers will be launched onto the Bottlerocket instances as they come online:

<<< files/service.yml

#### (Optional) Deploy the cluster auto updater

Bottlerocket has it's own automatic updater process which can update the Bottlerocket operating system in waves across your cluster, with automatic task draining to avoid downtime during restarts. You can find the [full source code for the automatic updater on Github](https://github.com/bottlerocket-os/bottlerocket-ecs-updater). Or you can use the following embedded stack to setup the updater:

<<< files/bottlerocket-updater.yml

#### Deploy it all

Use the following parent stack to deploy all the child stacks:

<<< files/parent.yml

You can deploy this parent stack using AWS SAM CLI via the following command:

```shell
sam deploy \
  --template-file parent.yml \
  --stack-name bottlerocket-environment \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM
```

#### Tear it down

You can tear down the entire stack with the following command:

```shell
sam delete --stack-name bottlerocket-environment
```

#### Next Steps

* Check out [the Bottlerocket repository](https://github.com/bottlerocket-os/bottlerocket#bottlerocket-os) or [the Bottlerocket learning site](https://bottlerocket.dev/) for more info on the project.
* Don't like CloudFormation? Try out the [Bottlerocket for ECS quicklaunch instructions for the AWS CLI](https://bottlerocket.dev/en/os/1.14.x/install/quickstart/aws/ecs/).
* Connect to a Bottlerocket host [using SSM and the control container](https://github.com/bottlerocket-os/bottlerocket#control-container).
