---
title: Internal worker or background service hosted on EC2 instances
description: >-
  A containerized worker or internal service, in a private network, managed by EC2, hosted on EC2 capacity.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: tool
    value: aws-sam-cli
  - key: app
    value: worker
  - key: capacity
    value: ec2
  - key: type
    value: pattern
authors:
  - peckn
date: May 18, 2023
---

#### About

A fully private service is generally used for important internal business services that need to be protected from direct access by the public:

- Cache service such as Redis
- Internal API that provides a thin wrapper around a database
- Billing, password and authentication, or other similar service that has personally identifying information.
- Internal background worker service

#### Architecture

A private service’s architecture looks like this:

!!! @/pattern/worker-ecs-ec2-cloudformation/architecture.svg

An internal service does not have any public facing ingress for receiving traffic from the public. Instead it can only receive traffic from other internal services in the same VPC, using DNS based service discovery or ECS Service Connect. However, you can use a NAT gateway so that this internal service is able to make outbound requests.

The following diagram shows how an internal service may work alongside a public facing service in the same private network:

!!! @/pattern/worker-ecs-ec2-cloudformation/diagram.svg

Requests from the public internet go to a public facing Application Load Balancer. The Application Load Balancer distributes requests to underlying containers hosted in the private subnets of the VPC. These containers are able to make internal requests to the private internal services. This service to service communication stays entirely inside of the VPC, and is protected by AWS security group authorization.

#### Dependencies

This pattern requires that you have an AWS account, and that you use AWS Serverless Application Model (SAM) CLI. If not already installed then please [install SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) for your system.

#### Define the VPC

To deploy this pattern you will use the [base pattern that defines a large VPC for an Amazon ECS cluster](/large-vpc-for-amazon-ecs-cluster). This will deploy the public and private subnets as well as the NAT gateway that provides internet access to the private subnets. Download the `vpc.yml` file from that pattern, but don't deploy it yet. You will deploy the VPC later as part of this pattern.

#### Define the cluster

The following CloudFormation defines an ECS cluster that has a capacity provider that launches EC2 instances on demand as you request for ECS to deploy containers. The instances will be launched in the public subnet.

<<< files/cluster.yml

#### Define the service

Next we need to define an ECS service which is configured to use AWS VPC networking mode, and launch itself in the ECS cluster, while making use of the capacity provider to request EC2 capacity for itself:

<<< files/service.yml

#### Deploy it all

You should have the following three files:

- `vpc.yml` - Template for the base VPC that you wish to host resources in
- `cluster.yml` - Template for the ECS cluster and its capacity provider
- `service.yml` - Template for the web service that will be deployed on the cluster

Use the following parent stack to deploy all three stacks:

<<< files/parent.yml

Use the following command to deploy all three stacks:

```shell
sam deploy \
  --template-file parent.yml \
  --stack-name internal-service-environment \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM
```

#### Test it out

Open the ECS console and verify that the service has successfully launched tasks onto EC2 capacity. You can look at the "Health and metrics" tab of the service to find the load balancer. Click through to view the load balancer details and try to open the load balancer URL in your browser.

You will see that the request fails. The load balancer is not accessible on the public internet. In order to access the private service we will need to send the request from a location that originates inside of the VPC. To do this we can launch a Cloud9 IDE inside of the VPC.

1. Open the [Cloud9 Console](https://console.aws.amazon.com/cloud9control/home)
2. Click "Create Environment"
3. Give the environment a name like "test"
4. Expand "Networking Settings -> VPC settings". Set the VPC to match the VPC of the deployed ECS service, and set the subnet to a public subnet from that VPC.
5. Click "Create" and the open up the IDE. It may take a minute or two to provision the IDE for you

Once you have your IDE open you can open a terminal tab and enter a `curl` command to test connectivity to your private service. Substitute in the URL of your own private load balancer:

```
curl internal-inter-Priva-1WLG41K72MW87-1443375381.us-east-2.elb.amazonaws.com
```

You should see an HTML plaintext response similar to this:

```txt
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
```

You have successfully verified that your private service is accessible from within the VPC, but not from outside on the public internet.

#### Tear it down

You can use the following command to tear down the stack:

```shell
sam delete --stack-name internal-service-environment
```

::: warning
If you followed the test instructions to launch a Cloud9 IDE inside of the VPC you will also need to go into the Cloud9 dashboard to delete that IDE.
:::

#### See Also

- Prefer to run serverless containers? [Deploy an internal worker service on AWS Fargate, that does jobs from an SQS queue](/background-worker-sqs-queue-container-copilot)
