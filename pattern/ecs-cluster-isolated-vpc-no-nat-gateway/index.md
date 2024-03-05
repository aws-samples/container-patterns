---
title: Amazon ECS cluster with isolated VPC and no NAT Gateway
description: >-
  Run an isolated ECS cluster with no internet access, only PrivateLink endpoints
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
authors:
 - peckn
date: 2024-03-01
---

#### Terminology

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) is a serverless orchestrator that manages container deployments on your behalf.

[Amazon Virtual Private Cloud (VPC)](https://aws.amazon.com/vpc/) helps you define and launch AWS resources in a logically isolated virtual network.

[AWS PrivateLink](https://aws.amazon.com/privatelink/) helps establish connectivity between VPC's and AWS services without exposing data to the internet.

In this pattern you will learn how to setup a private, isolated container workload, orchestrated by Amazon ECS. Containers will run in an isolated VPC that has no internet access at all. Access to foundational AWS services will provided via AWS PrivateLink.

#### Why?

A fully isolated VPC is used in the following situations:

- You wish to avoid all possibility of dangerous inbound communications from the internet. An isolated VPC does not even have an internet gateway that would allow inbound traffic to reach your workloads.
- You want to avoid the possibility of data exfiltration. The isolated VPC does not have a NAT gateway or other route to the public internet. Data can only be exfiltrated via AWS services like S3, or similar. Therefore it is a lot easier to lock down the flow of data out of the network as well.
- You want to avoid using public IP addresses at all. In the isolated network there is no public IP address usage whatsoever.

#### Architecture

The following diagram depicts what you will deploy:

!!! @/pattern/ecs-cluster-isolated-vpc-no-nat-gateway/diagram.svg

* The deployed VPC is exclusively made up of private subnets. There are no public subnets, therefore there is no public IP address usage, no internet gateway, no NAT gatways, and no inbound or outbound internet access at all.
* In order to have access to the required AWS services, the VPC has PrivateLink endpoints and an S3 gateway. The following endpoints are included out of the box:
   - `com.amazonaws.<region>.ecr.api` - Access to the Elastic Container Registry API, used for downloading container images
   - `com.amazonaws.<region>.ecr.dkr` - Access to the Docker endpoint for ECR, used for downloading container images
   - `com.amazonaws.<region>.secretsmanager` - Access to Secrets Manager, if you use secrets in your ECS task definition
   - `com.amazonaws.<region>.systemsmanager` - This allows you to use Amazon ECS Exec to open connections to an interactive shell inside the task.
   - `com.amazonaws.<region>.logs` - Access to upload the container logs
   - `com.amazonaws.<region>.s3` - Gateway endpoint for access to download the container image layers themselves
* The following optional endpoints are also included, but disabled by default as they are not needed for an AWS Fargate based deployment. You can enable these endpoints if you intend to deploy ECS tasks on EC2 capacity:
   - `com.amazonaws.<region>.ecs`
   - `com.amazonaws.<region>.ecs-agent`
   - `com.amazonaws.<region>.ecs-telemetry`

#### Dependencies

This pattern uses AWS SAM CLI for deploying CloudFormation stacks on your account.
You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

#### Define the isolated VPC

Download the `isolated-vpc.yml` file which defines the private VPC:

<<< ./files/isolated-vpc.yml

Note that the following resources are not created by default:

- `EcsAgentEndpoint`
- `EcsTelemetryEndpoint`
- `EcsEndpoint`

These endpoints are not necessary for an AWS Fargate based deployment. If you plan to deploy to EC2 capacity, you can enable these endpoints by modifying the `DeployingToEC2` parameter on this template.

#### Define the cluster

Download the following `cluster.yml` to define the cluster that will host the container tasks:

<<< ./files/cluster.yml

#### Define the container workload

Download the following `private-service.yml` to define an ECS service deployed on AWS Fargate, with tasks hosted in a private VPC subnet.

<<< ./files/private-service.yml

Note that `AssignPublicIp` setting for the `AWS::ECS::Service` must be set to false, as the private subnets being used for deployment do not have any path to the internet and no capability to actually use public IP addresses.

#### Build and Push a Sample Container

When running an private service in an isolated VPC, it is not possible
to pull sample images from a public registry on the public internet. Therefore,
you must build and push your own private container image to run. The following
instructions will guide you through this process.

Start by downloading the following `Dockerfile` that defines the container image:

<<< ./files/service/Dockerfile{Dockerfile}

Then use the following commands to create a private ECR repository, build the
container image, and then push the container image to the private repository:

::: info
The following script assumes that you already have the [Amazon ECR credential helper](https://github.com/awslabs/amazon-ecr-credential-helper) installed in your dev environment. This credential helper will automatically obtain credentials for uploading private container images when needed, using your environment's AWS credentials or role.
:::

```sh
# Replace this with a static value once the REPO is created.
REPO_URI=$(aws ecr create-repository --repository-name sample-app-repo --query 'repository.repositoryUri' --output text)
docker build -t ${REPO_URI}:sample .
docker push ${REPO_URI}:sample
```

#### Deploy it All

Download the following `parent.yml` which deploys the other reference templates:

<<< ./files/parent.yml

You should now have the following files locally:

- `parent.yml` - Top level stack that deploys the child stacks
- `isolated-vpc.yml` - Creates the isolated VPC with PrivateLink endpoints
- `cluster.yml` - Creates the Amazon ECS cluster
- `private-service.yml` - Creates a private service hosted in the isolated VPC.

Use the following command to deploy the entire infrastructure:

```sh
sam deploy \
  --template-file parent.yml \
  --stack-name isolated-vpc-environment \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides ImageUri=${REPO_URI}:sample \
  --resolve-s3
```

After the stack deploys you can open the Amazon ECS console to verify that you are running two copies of a simple `busybox` based container.

#### Tear it Down

When you are done you can use the followin command to tear down the reference architecture:

```sh
sam delete --stack-name isolated-vpc-environment --no-prompts
```

#### Next Steps

This architecture deliberately excludes ingress from the public internet. If you do have a workload where you want both network isolation and a limited amount of internet traffic ingress consider deploying an API Gateway using the approach from the pattern: ["Serverless API Gateway Ingress for AWS Fargate, in CloudFormation"](api-gateway-fargate-cloudformation). This approach can be adopted to get serverless internet ingress without any public subnets at all, by creating an `AWS::ApiGatewayV2::VpcLink` to the private subnets.

If you require access to additional AWS services you may need to add additional PrivateLink endpoints. This reference is designed to include only the most minimal set of AWS services required to have a functional Amazon ECS based deployment.