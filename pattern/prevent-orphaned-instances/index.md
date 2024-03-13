---
title: Prevent orphaned EC2 container instances in ECS Cluster
description: >-
  A pattern that will verify that your EC2 instance is registered the ECS cluster after a autoscaling event.
filterDimensions:
  - key: tool
    value: aws-sam-cli
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: capacity
    value: ec2
  - key: feature
    value: capacity-provider
authors:
  - maishsk
date: March 14 2024
---

#### Dependencies

This pattern uses the AWS SAM CLI for deploying CloudFormation stacks on your AWS account.
You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

#### About

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) is a highly scalable, high performance container management service that runs containers on a managed cluster of Amazon EC2 instances, or using serverless AWS Fargate capacity.

[Amazon EC2](https://aws.amazon.com/ec2) is a web service that provides resizable compute capacity in the cloud. It is designed to make web-scale computing easier for developers.

[AWS Lambda](https://aws.amazon.com/lambda) lets you run code without provisioning or managing servers. You pay only for the compute time you consume - there is no charge when your code is not running. With Lambda, you can run code for virtually any type of application or backend service - all with zero administration.

[AWS Systems Manager](https://aws.amazon.com/systems-manager) allows you to centralize operational data from multiple AWS services and automate tasks across your resources on AWS and in multicloud and hybrid environments. You can create logical groups of resources such as applications, different layers of an application stack, or production versus development environments.

[Amazon CloudWatch](https://aws.amazon.com/cloudwatch) is an AWS monitoring service for cloud resources and the applications that you run on AWS. You can use Amazon CloudWatch to collect and track metrics, collect and monitor log files, and set alarms.

[Amazon EventBridge](https://aws.amazon.com/eventbridge) Amazon EventBridge is a service that provides real-time access to changes in data in AWS services, your own applications, and software as a service (SaaS) applications without writing code. 

#### Architecture

::: warning
This pattern is not suited for instances running on:

- Windows operating systems
- [Bottlerocket](https://bottlerocket.dev/)
:::


This pattern will deploy the following architecture:

!!! @/pattern/prevent-orphaned-instances/diagram.svg

1. The Autoscaling group intiats a scaling event 
2. An EventBridge rule runs when new instances are launched in the autoscaling group in the ECS cluster.
3. The event triggers an AWS Lambda function to run a specific SSM document on the newly launched EC2 instance.
4. The SSM document runs a health check script to verify if the EC2 instances has passed all the necessary checks and can run ECS tasks.
5. The output of the script will be sent to Amazon CloudWatch.
6. If configured (not enabled by default) instances that did not register correctly with the ECS cluster will be terminated.

::: warning
The instances in your autoscaling group must have the following IAM policies included as part of the IAM role
```
CloudWatchAgentServerPolicy
AmazonSSMManagedInstanceCore
AmazonEC2ContainerServiceforEC2Role
```
:::


#### Customization
You can customize a number of parameters of the pattern deployment by modifying the code in the CloudFormation stack:

- `WaitTimer` This is the period of time that the script will wait for the ECS to become healthy, before tunning the script. Default is 300 seconds.
- `TerminateEnabled` Should the instance be terminated if the health check script fails. Default is false. 


#### Deploy the pattern

Download the following stack: 

<<< files/orphan-instance-stack.yml

First set the `ASG_NAME` with the name of your autoscaling group you are using in your cluster

```shell
ASG_NAME='myasg'
```

Use the following AWS SAM CLI command to deploy the stack

```shell
sam deploy \ 
 --template-file orphan-instance-stack.yml \ 
 --stack-name ecs-orphan-instance-detector \ 
 --capabilities CAPABILITY_IAM \ 
 --parameter-overrides ParameterKey=AutoScalingGroupName,ParameterValue=$ASG_NAME
```

#### Test it out

Modify your autoscaling group to add additional instances ECS cluster. Once the instance has reached running state, go over to the Lambda function (ECSOrphanInstanceLambda) and see that first entry under Recent invocations  has a timestamp that’s around the same time when instance was launched (this may take a bit to populate). You can alternatively view the CloudWatch log group (`ecs-orphan-instance-lambda-log-group`) and find the most recent entry to see that the progress of the Lambda invocation. You can also see the output of the script that was run on the instance by browsing to the `ecs-orphan-instance-checker-output-log-group` CloudWatch log group.


#### Clean up
To clean up the resources created, you will want to clean up the two CloudFormation stacks you deployed as part of this pattern.

```sh
sam delete  --stack-name ecs-orphan-instance-detector
```