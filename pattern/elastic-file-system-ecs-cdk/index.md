---
title: Durable storage volume for AWS Fargate, using Cloud Development Kit (CDK)
description: >-
  This Cloud Development Kit (CDK) app shows how to attach an Elastic File System (EFS) to
  an application running in AWS Fargate
filterDimensions:
  - key: tool
    value: cdk
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
date: Jun 29, 2023
alternatives:
  - key: tool
    value: copilot
    id: elastic-file-system-aws-copilot
    description: AWS Copilot is a command line tool for developers that want to go from Dockerfile to deployment without touching infrastructure.
  - key: tool
    value: cloudformation
    id: cloudformation-ecs-durable-task-storage-with-efs
    description: AWS CloudFormation is a YAML format for describing infrastructure as code.
  - key: tool
    value: cdk
    id: ecs-service-extensions-cdk-efs-volume
    description: ECS Service Extensions enables smaller, reusable extensions for common
      configurations such as attaching a durable file system volume.
---

#### About

[AWS Fargate](https://aws.amazon.com/fargate/) is a serverless compute for running your containers. It comes with a large ephemeral storage
volume that you can use to store data you are working on. However, this ephemeral storage space is
wiped when the task stops and restarts.

[Amazon Elastic File System](https://aws.amazon.com/efs/) provides durable serverless file storage over the network. An Elastic File
System can be shared between multiple tasks and applications, and it automatically grows and shrinks
as you store additional files or delete files.

[AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/) is an SDK that lets you write infrastructure as code as declarative statements
in many popular programming languages that you are already familiar with. Rather than needing to learn
a new YAML format you can use your favorite toolchains to synthesize CloudFormation that deploys your
architecture.

In this pattern you will use AWS Cloud Development Kit to deploy an [NGINX](https://www.nginx.com/) web server that runs in AWS Fargate. The web server will serve web content out of a shared filesystem provided by Amazon Elastic File System.

#### Architecture

The following diagram shows the architecture of this pattern:

!!! @/pattern/elastic-file-system-ecs-cdk/diagram.svg

1. The application deployment consists of two NGINX web server containers that run as tasks in AWS Fargate. Traffic can be sent to the containers using an Application Load Balancer.
2. Amazon Elastic Container Service orchestrates attaching a durable storage volume to both containers, at the path `/usr/share/nginx/html`.
3. Both containers now see and share the same `index.html` file. Changes to the file are automatically propagated to both containers.
4. We can use the Amazon ECS Exec feature to open a secure shell to a running container and change the contents of `index.html`, then see the changes propagate to all tasks.

#### Development Environment

To use this pattern you need:

* Node.js and NPM (TypeScript will be automatically installed via `package.json`)
* [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and the [Session Manager plugin for AWS CLI](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html).

Once all tools are installed, create the following files:

<tabs>
<tab label="package.json">

<<< files/package.json

</tab>

<tab label='tsconfig.json'>

<<< files/tsconfig.json

</tab>

<tab label='cdk.json'>

<<< files/cdk.json

</tab>
</tabs>

The files above serve the following purpose:

- `package.json` - This file is used by NPM or Yarn to identify and install all the required dependencies:
- `tsconfig.json` - Configures the TypeScript settings for the project:
- `cdk.json` - Tells CDK what command to run, and provides a place to pass other contextual settings to CDK.

#### CDK Application​

Now you can create an `index.ts` file that has the actual code for the CDK application:

<<< files/index.ts

You can now use the following commands to preview infrastruture to be created, and then deploy the CDK application:

```shell
npm run-script cdk diff
npm run-script cdk deploy
```

#### Test out the application

The CDK application will output the URL of the load balancer in front of the application. You can also
find the URL in the Amazon ECS console by locating the deployed service and looking at its details.

If you open this URL in your browser you will currently just see a `403 Forbidden` error as the NGINX webserver is not going to find any content inside of the file system. Let's fix this.

Run the following command to open up an interactive shell inside one of the running containers. Note that you will have to substitute the generated name of your own ECS cluster and task ID:

```shell
aws ecs execute-command \
  --cluster <insert cluster name here> \
  --task <insert task ID here> \
  --container nginx \
  --interactive \
  --command "/bin/sh"
```

::: tip
If you get an error that says `SessionManagerPlugin is not found`, please [install the Session Manager plugin for AWS CLI](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html).
:::

Inside of the shell run the following commands to create a hello world message for the NGINX webserver to respond with:

```shell
cd /usr/share/nginx/html
echo "Hello world" > index.html
```

Now you can reload the URL of the service's load balancer and see a "Hello world" message instead of `403 Forbidden`. Reload the URL a few times. Even though there are two copies of the NGINX webserver you will notice that as you reload you see "Hello world" in every response. This is because the Elastic File System ensures that both running tasks have the same content available in their shared storage volume. So the file that you added on one container is accessible in the other container as well.

To ensure that your changes are durably persisted try using the Amazon ECS console to stop both tasks. Amazon ECS will restart the tasks, and when they restart you can refresh the URL again. You will still see th same "Hello world" message because the `index.html` file has been durably persisted into the Elastic File System, and will still be there even after the tasks stop and restart.

#### Tear it down

Once you are done testing you can clean up everything by running the following command:

```shell
npm run-script cdk destroy
```

::: warning
After the CDK destroy has completed you must go to the [Amazon EFS console](https://console.aws.amazon.com/efs/home?#/file-systems) to delete the elastic filesystem. By default, CDK does not destroy filesystems or other stores of durable state, in order to avoid accidental data loss.
:::

#### See Also

- If you prefer to use AWS CloudFormation directly then check out the accompanying [CloudFormation pattern for an Amazon ECS task with attached Elastic File System](/cloudformation-ecs-durable-task-storage-with-efs)
- If you like to work on the command line then see the tutorial for [using AWS Copilot to deploy an Elastic File System backed application](/elastic-file-system-aws-copilot)