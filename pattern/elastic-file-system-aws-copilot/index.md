---
title: Launch a task with durable storage, using AWS Copilot
description: >-
  AWS Copilot manifest that
  defines an ECS task with a durable file system volume attached.
filterDimensions:
  - key: tool
    value: copilot
  - key: capacity
    value: fargate
  - key: type
    value: pattern
  - key: feature
    value: efs
  - key: feature
    value: exec
authors:
 - peckn
date: July 5, 2023
alternatives:
  - key: tool
    value: cdk
    id: elastic-file-system-ecs-cdk
    description: AWS Cloud Development Kit is better if you prefer to interact with infrastructure using
      a programmatic SDK.
  - key: tool
    value: cloudformation
    id: cloudformation-ecs-durable-task-storage-with-efs
    description: AWS CloudFormation is a YAML format for describing infrastructure as code.
---

#### About

[AWS Copilot](https://aws.github.io/copilot-cli/) is the official command line tool for Amazon ECS. It helps you to describe the container application that you would like to deploy. Then Copilot turns your higher level description into a production ready CloudFormation template that it deploys on your behalf.

[Amazon Elastic File System](https://aws.amazon.com/efs/) provides durable serverless file storage over the network. An Elastic File
System can be shared between multiple tasks and applications, and it automatically grows and shrinks
as you store additional files or delete files.

In this pattern you will use AWS Copilot to deploy an [NGINX](https://www.nginx.com/) web server that runs in AWS Fargate. The web server will serve web content out of a shared filesystem powered by Amazon Elastic File System.

#### Architecture

The following diagram shows the architecture of this pattern:

!!! @/pattern/elastic-file-system-ecs-cdk/diagram.svg

1. The application deployment consists of two NGINX web server containers that run as tasks in AWS Fargate. Traffic can be sent to the containers using an Application Load Balancer.
2. Amazon Elastic Container Service orchestrates attaching a durable storage volume to both containers, at the path `/usr/share/nginx/html`.
3. Both containers now see and share the same `index.html` file. Changes to the file are automatically propagated to both containers.
4. We can use the Amazon ECS Exec feature to open a secure shell to a running container and change the contents of `index.html`, then see the changes propagate to all tasks.

#### Dependencies

This pattern requires:

- An AWS account, and [local credentials for connecting to that account](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html).
- [AWS Copilot CLI](https://aws.github.io/copilot-cli/docs/getting-started/install/)

#### Start a new application

Kick off a new application in your terminal using the following command:

```shell
copilot init
```

AWS Copilot will now go through a wizard flow to ask you information about what type of application you wish to create. Use the following choices:

```
Would you like to use one of your existing applications? (Y/n) n
```

```
Ok, let's create a new application then.
  What would you like to name your application? [? for help] efs-application
```

```
Which workload type best represents your architecture?  [Use arrows to move, type to filter, ? for more help]
    Request-Driven Web Service  (App Runner)
  > Load Balanced Web Service   (Internet to ECS on Fargate)
    Backend Service             (ECS on Fargate)
    Worker Service              (Events to SQS to ECS on Fargate)
    Static Site                 (Internet to CDN to S3 bucket)
    Scheduled Job               (Scheduled event to State Machine to Fargate)
```

```
 What do you want to name this service? [? for help] efs-service
```

We will not be building a local Dockerfile into a container image. Instead we will use a prebuilt image that has been publishing on a public registry.

```
Which Dockerfile would you like to use for efs-nginx?  [Use arrows to move, type to filter, ? for more help]
    Enter custom path for your Dockerfile
  > Use an existing image instead
```

We will deploy the public NGINX image from Elastic Container Registry: `public.ecr.aws/nginx/nginx:latest`

```
 What's the location ([registry/]repository[:tag|@digest]) of the image to use? [? for help] public.ecr.aws/nginx/nginx:latest
```

The application expects traffic on port `80`.

```
Which port(s) do you want customer traffic sent to? [? for help] (80)
```

AWS Copilot will now create supporting infrastructure for publishing your application and write a manifest file. This will take approximately 30 seconds:

```
- Creating the infrastructure for stack efs-application-infrastructure-roles                    [create complete]  [33.6s]
  - A StackSet admin role assumed by CloudFormation to manage regional stacks                   [create complete]  [14.6s]
  - An IAM role assumed by the admin role to create ECR repositories, KMS keys, and S3 buckets  [create complete]  [14.7s]
✔ The directory copilot will hold service manifests for application efs-application.

✔ Wrote the manifest for service efs-service at copilot/efs-service/manifest.yml
Your manifest contains configurations like your container size and port.
```

Last but not least AWS Copilot will ask if you are ready to deploy your application to a test environment.

```
Would you like to deploy a test environment? [? for help] (y/N)
```

Don't enter yes or no quite yet. Let's make a few changes to the manifest first before deploying.

#### Configuring the Elastic File System

The application manifest is not yet deploying an Elastic File System.

Open up the file `copilot/efs-service/manifest.yml`. We need to modify this file to add an Elastic File System.

Use the following `manifest.yml` file as a template:

<<< @/pattern/elastic-file-system-aws-copilot/files/copilot/efs-service/manifest.yml

Important things to note:

- `count: 2` - This tells Copilot to deploy two copies of the container. This will allow us to ensure that both tasks are seeing the same shared filesystem.
- `exec: true` - This tells Copilot to turn on the Amazon ECS exec feature, so that you can easily open a shell inside of a running container
- The `storage` section tells Copilot to create an Elastic File System and mount it to the path `/usr/share/nginx/html` inside each container

Now deploy the changes by going back to the terminal running AWS Copilot and entering `y` to deploy the test environment.

#### Hydrate volume

Once the application deploys you can open it's URL in your browser, but all you will see is a 403 Forbidden error. This is because the EFS filesystem starts out empty. Let's fix that.

Use the following command to open a shell to a task from the service:

```
copilot svc exec
```

Now you can create a file for the web server to respond with using the following commands:

```shell
cd /usr/share/nginx/html
echo "Hello world" > index.html
```

Now you can refresh the URL of the service and see that both NGINX web servers are serving the same `index.html`. You can also test out changing the file contents to see the changes propagate to both tasks.

#### Tear it down

When you are done experimenting tear down the stack with the following commands:

```shell
copilot app delete
```

#### See Also

If you'd like to explore other paths check out the following:

- CloudFormation: [A sample YAML template that deploys this same Elastic File System infrastructure](cloudformation-ecs-durable-task-storage-with-efs)
- AWS Cloud Development Kit: [A TypeScript app that uses the Cloud Development Kit SDK to deploy this same infrastructure](elastic-file-system-ecs-cdk)