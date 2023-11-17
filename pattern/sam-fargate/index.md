---
title: Using Amazon ECS Fargate with AWS SAM CLI
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
date: Nov 15 2023
---

#### Dependencies

This pattern uses the AWS SAM CLI for deploying CloudFormation stacks on your AWS account.
You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

#### About

AWS SAM CLI streamlines the deployment of your containerized applications and necessary infrastructure resources efficiently. An extension of AWS CloudFormation, SAM CLI simplifies serverless application deployment and management by allowing you to define infrastructure as code. This facilitates version control and reproducibility, simplifying the packaging and deployment of your application code, dependencies, and configurations.

This pattern will show how to deploy a simple nodeJS application to AWS Fargate using AWS SAM CLI. The following resources will be created as part of the provided templates:

- Fargate Cluster
- Amazon Elastic Container Registry
- Fargate Service
- Fargate Task Definition
- Amazon VPC
- Internet Gateway
- 2 Public Subnets
- 2 Private Subnets
- Application Load Balancer

#### Architecture

The following diagram shows the architecture that will be deployed:

!!! @/pattern/sam-fargate/diagram.svg

#### Define your Infrastructure

The following AWS SAM CLI template.yml creates a simple Amazon ECS cluster using AWS Fargate.

As part of the `template.yml`, the following resources will be created:

- Amazon ECS Cluster 
- ECR Repo
- Log Group
- All IAM related roles/policies

In addition to the `template.yml`, you will also need a `vpc.yml`, where the necessary network resources are defined.

Finally, AWS SAM CLI will also look for a samconfig file, which contains default parameters for your Infrastructure as Code.

<tabs>

<tab label='template.yml'>

<<< @/pattern/sam-fargate/files/template.yml

</tab>

<tab label='vpc.yml'>

<<< @/pattern/sam-fargate/files/vpc.yml

</tab>

<tab label='samconfig.toml'>

<<< @/pattern/sam-fargate/files/samconfig.toml

</tab>

</tabs>

You will also need an application you can deploy to your infrastructure. For the purpose of this demo, a simple Hello World nodeJS application is provided for you.

<tabs>

<tab label='index.js'>

<<< @/pattern/sam-fargate/files/index.js

</tab>

<tab label='package.json'>

<<< @/pattern/sam-fargate/files/package.json

</tab>

<tab label='Dockerfile'>

<<< @/pattern/sam-fargate/files/Dockerfile

</tab>

Once you have the files downloaded, you can deploy your infrastructure using the following commands:

```sh
sam build && sam deploy
```

</tabs>

#### Test it Out

After the provided templates are deployed, you can find the the following AWS CloudFormation outputs using the following commands:

```sh
RepositoryUrl=$(aws cloudformation --region us-east-1 describe-stacks --stack-name nodejs-sam --query "Stacks[0].Outputs[?OutputKey=='RepositoryUrl'].OutputValue" --output text) && echo $RepositoryUrl

FQDN=$(aws cloudformation --region us-east-1 describe-stacks --stack-name nodejs-sam --query "Stacks[0].Outputs[?OutputKey=='FQDN'].OutputValue" --output text) && echo $FQDN
```

::: warning
**Note:** You will want to build and push your container image prior to deploying this application to Fargate. 

The default template will look for the image in your provisioned Amazon Elastic Container Registry with the tag "latest". Once the image exists, you will be able to test your application using the output retrieved from the FQDN command. 
:::

:::tip
In Production, it's not best practice to use the `latest` tag for your containerized application images. Instead, you'll want to [tag your images per release](release-container-to-production-task-definition) as part of your CI/CD workflow or pipeline. 
:::

