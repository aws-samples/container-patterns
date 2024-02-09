---
title: BuildIt SAM Dice App on Amazon ECS using AWS Fargate
description: >-
  How to deploy a simple public facing application on AWS Fargate using AWS SAM CLI
filterDimensions:
  - key: tool
    value: aws-sam-cli
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: app
    value: website
authors:
  - jldeen
date: Feb 9 2024
---

#### Dependencies

This pattern uses the AWS SAM CLI for deploying CloudFormation stacks on your AWS account.
You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

#### About

AWS SAM CLI streamlines the deployment of your containerized applications and necessary infrastructure resources efficiently. An extension of AWS CloudFormation, SAM CLI simplifies serverless application deployment and management by allowing you to define infrastructure as code. This facilitates version control and reproducibility, simplifying the packaging and deployment of your application code, dependencies, and configurations.

This pattern will show how to deploy a simple frontend application to AWS Fargate using AWS SAM CLI. The following resources will be created as part of the provided templates:

- AWS Fargate Cluster
- Amazon Elastic Container Registry
- Fargate Service
- Fargate Task Definition
- Amazon VPC
- Internet Gateway
- 2 Public Subnets
- 2 Private Subnets
- Application Load Balancer
- Amazon DynamoDB Database

#### Architecture

The following diagram shows the architecture that will be deployed:

!!! @/pattern/sam-fargate/diagram.svg

#### Define your Infrastructure

The code for this pattern is located on GitHub [here](https://github.com/jldeen/ecs-sam-dice).

The application is written in Rust. A Dockerfile has been provided for you and can be found in the `./fargate` folder of the repo.

The IaC folder contains the SAM CLI template files and will deploy all infrastructure needed for a successful deployment.

To begin, you will want to provision your base infrastructure. This will stand up your Amazon Elastic Container Registry (ECR) so you can build and push your container image.

```sh
cd ./iac/base

sam build && sam deploy
```

Next, you will want to build and push your container image. Be sure to build this in x86_64 architecture. To learn more about multi-platform images, check out Docker's documentation [here](https://docs.docker.com/build/building/multi-platform/). This is especially important if you're using macOS with an Apple Silicon chip. 

:::tip
When building your container image on an ARM based system, you'll want to use the `--platform linux/amd64` flag.
:::

You can find the instructions to build and push your container image in the AWS Console for Elastic Container Registry. Once your repository has been created, you can drill down into that repo i.e. `sam-dice-ecrrepo-xxxxxx` and then locate the "View Push Commands" button on the top right hand side.

Once you have your image built locally and pushed to your new registry, you are ready to deploy the rest of your infrastructure.

```sh
cd ./iac 
sam build && sam deploy
```

#### Test it Out
Once the second deployment completes, you should have the application running in your Amazon ECS cluster. You can run the following command to get the URL of your application.

```sh
FQDN=$(aws cloudformation --region us-east-1 describe-stacks --stack-name sam-dice --query "Stacks[0].Outputs[?OutputKey=='FQDN'].OutputValue" --output text) && echo $FQDN
```

Once you have the URL of your application, you can "roll the dice" by using `curl`. Note: There is no slash after `${FQDN}`. This is intentional - the slash is included in the environment variable.

```sh
curl ${FQDN}roll/2
```

:::tip
If you'd like to see your log stream of your application, you can easily access the CloudWatch logs using SAM CLI.

Simply run the following command in your terminal: `sam logs --region us-east-1 --cw-log-group /samdice --tail`
:::

#### Clean up
To clean up the resources created, you will want to clean up the two CloudFormation stacks you deployed as part of this pattern.

```sh
cd ./iac
sam delete
```

Once the above stack deletes, you will want to delete the first stack you deployed that contains your Amazon Elastic Container Registry.

```sh
cd ./iac/base
sam delete
```

::: warning
**Note:** You will need to build and push your container image prior to deploying this application to Fargate. 

The default template will look for the image in your provisioned Amazon Elastic Container Registry with the tag "latest". Once the image exists, you will be able to test your application using the output retrieved from the FQDN command. 
:::

:::tip
In Production, it's not best practice to use the `latest` tag for your containerized application images. Instead, you'll want to [tag your images per release](release-container-to-production-task-definition) as part of your CI/CD workflow or pipeline. 
:::

