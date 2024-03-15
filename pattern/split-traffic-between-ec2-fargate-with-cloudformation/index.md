---
title: Split web traffic between Amazon EC2 and AWS Fargate
description: >-
  CloudFormation example of how to setup an Application Load Balancer
  that distributes web traffic across an ECS service running on both EC2 and Fargate.
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
date: Apr 28, 2023
---

#### About

Amazon ECS can orchestrate your application across a range of different capacity types. In this pattern you will learn how to use Amazon ECS to setup an Application Load Balancer that distributes traffic across both Amazon EC2 capacity, and AWS Fargate capacity.

The following diagram shows what will be deployed:

!!! @/pattern/split-traffic-between-ec2-fargate-with-cloudformation/diagram.svg

#### Build the sample application

The Node.js sample application grabs information from the ECS Task Metadata endpoint, and returns it to the requester on port 80.

Create the following three files:

<tabs>
<tab label="app/index.js">

<<< files/index.js

</tab>

<tab label='app/package.json'>

<<< files/package.json

</tab>

<tab label='app/Dockerfile'>

<<< files/Dockerfile{Dockerfile}

</tab>
</tabs>

You should have the following folder structure:

- `app` - Folder containing the application code
- `app/index.js` - The actual code for the sample application
- `app/package.json` - A manifest files that lists some open source packages from NPM that the application depends on
- `app/Dockerfile` - Instructions on how to build the application and package it up into a container image.

Now you can build and push the image to ECR using command like this (substitute [your own ECR private repository URL](https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-create.html)):

```shell
REPO_URI=$(aws ecr create-repository --repository-name sample-app-repo --query 'repository.repositoryUri' --output text)
if [ -z "${REPO_URI}" ]; then
  REPO_URI=$(aws ecr describe-repositories --repository-names sample-app-repo --query 'repositories[0].repositoryUri' --output text)
fi
docker build -t ${REPO_URI}:ecs-metadata ./app
docker push ${REPO_URI}:ecs-metadata
```

#### Deploy an ECS cluster and environment

In order to run this sample template you will need an ECS cluster with an EC2 capacity provider attached to it. You can follow the [EC2 capacity provider pattern](/ecs-ec2-capacity-provider-scaling) to get an example CloudFormation template that will deploy the cluster and the capacity provider.

#### Deploy the sample application

The following template will deploy the sample `ecs-metadata` application (or any other image that you pass to it). The image will be deployed twice: once on EC2 and one of AWS Fargate. Finally an Application Load Balancer is provisioned which sends 50% of the traffic to the EC2 service, and 50% of the traffic to the AWS Fargate service.

<<< files/service-across-ec2-and-fargate.yml

The template requires the following input parameters:

- `ImageURI` - The URI of the image to deploy. This should match the image that you built and pushed above.
- `Cluster` - The name of an ECS cluster on this account. This cluster should have EC2 capacity available in it. All ECS clusters come with AWS Fargate support already built-in. For an example of how to deploy an ECS cluster with EC2 capacity there is a pattern for [an ECS cluster using a EC2 capacity provider](/ecs-ec2-capacity-provider-scaling).
- `Ec2CapacityProvider` - The name of an EC2 capacity provider on this cluster. Again see the [ECS cluster with EC2 capacity provider pattern](/ecs-ec2-capacity-provider-scaling).
- `VpcId` - A virtual private cloud ID. This can be the default VPC that comes with your AWS account. Example: `vpc-79508710`
- `SubnetIds` - A comma separated list of subnets from the VPC. Example: `subnet-b4676dfe,subnet-c71ebfae`

Deploy this template with a command like this:

```sh
aws cloudformation deploy \
  --template-file service-across-ec2-and-fargate.yml \
  --stack-name service-across-ec2-and-fargate \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
     ImageURI=${REPO_URI}:ecs-metadata \
     Cluster=capacity-provider-environment-BaseStack-18PANC6K9E7D8-ECSCluster-NNBNpIh5AkZO \
     Ec2CapacityProvider=capacity-provider-environment-BaseStack-18PANC6K9E7D8-CapacityProvider-FI323ISAaRbn \
     VpcId=vpc-79508710 \
     SubnetIds=subnet-b4676dfe,subnet-c71ebfae
```

#### Next Steps

The services will initially deploy with only one of each task: one task on EC2 and one task on AWS Fargate. Try scaling up both services to launch additional tasks.

Note that the `Weight` option inside of the `AWS::ElasticLoadBalancingV2::Listener` forwarding configuration is controlling the balance of how traffic is distributed across the EC2 and Fargate versions of the service. It assumes an even 50% distribution to both.

You can also choose to scale up the AWS Fargate service higher than the Amazon EC2 service, and adjust the balance of traffic to send more traffic to the AWS Fargate version of the service.

Test out sending traffic to the single endpoint for the application. You should see response that look something like these samples:

```txt
Running on: EC2
DNS: ip-172-31-4-140.us-east-2.compute.internal
AvailabilityZone: us-east-2a
```

```txt
Running on: FARGATE
DNS: ip-172-31-41-78.us-east-2.compute.internal
AvailabilityZone: us-east-2c
```

By reloading the endpoint a few times you will see it flip back and forth between `EC2` and `FARGATE` as the load balancer distributes traffic evenly across both instances of the service.

#### Tear it down

You can use the following command to tear down the stack and delete the services:

```shell
# Tear down the CloudFormation
aws cloudformation delete-stack --stack-name service-across-ec2-and-fargate

# Empty and delete the Amazon ECR container registry we created
aws ecr delete-repository --repository-name sample-app-repo --force
```

You should also delete the container image that you uploaded to Amazon ECR.