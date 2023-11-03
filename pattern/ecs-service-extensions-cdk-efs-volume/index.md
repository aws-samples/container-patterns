---
title: Using ECS Service Extensions to attach a file system volume to a task
description: >-
  A service extension that attaches an Elastic File System (EFS) volume to a container
  running through ECS
filterDimensions:
  - key: tool
    value: cdk
  - key: type
    value: pattern
  - key: feature
    value: efs
  - key: feature
    value: exec
authors:
  - peckn
date: Jul 11 2023
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
    id: elastic-file-system-ecs-cdk
    description: A raw CDK application that shows the direct SDK calls, without ECS Extensions
---

#### About

The [`ecs-service-extensions`](https://www.npmjs.com/package/@aws-cdk-containers/ecs-service-extensions) package is an extendable plugin system for defining Amazon ECS service deployments in AWS Cloud Development Kit (CDK).

Amazon ECS has a large configuration area, and many different features that can be configured. The goal of ECS Service Extensions is to make smaller, reusable chunks of declarative CDK configuration that can be applied to your service in layers.

This pattern shows a service extension that attaches an Amazon Elastic File System to a task. It configures the volume on both the container as well as the task, and also provisions the appropriate IAM permissions and security group rules to allow communication between the
file system and the container.

#### Architecture

The following diagram shows the architecture of this pattern:

!!! @/pattern/elastic-file-system-ecs-cdk/diagram.svg

1. The application deployment consists of two NGINX web server containers that run as tasks in AWS Fargate. Traffic can be sent to the containers using an Application Load Balancer.
2. Amazon Elastic Container Service orchestrates attaching a durable storage volume to both containers, at the path `/usr/share/nginx/html`.
3. Both containers now see and share the same `index.html` file. Changes to the file are automatically propagated to both containers.
4. We can use the Amazon ECS Exec feature to open a secure shell to a running container and change the contents of `index.html`, then see the changes propagate to all tasks.

#### Dependencies

To use this pattern you will need:

* Node.js and NPM (TypeScript will be automatically installed via `package.json`)
* [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and the [Session Manager plugin for AWS CLI](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html).

#### Setup Cloud Development Kit

To use this pattern you need [Node.js](https://nodejs.org/en) installed. First, ensure that you have Node.js installed on your development machine. Then create the following files:

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

Run the following commands to install dependencies and setup your AWS account for the deployment:

```sh
npm install
npm run-script cdk bootstrap
```

#### Setup the Service Extensions

We will use the following three files to define three service extensions that will be applied to our service.

<tabs>
<tab label="efs-volume.ts">

<<< files/efs-volume.ts

</tab>

<tab label='static-scale.ts'>

<<< files/static-scale.ts

</tab>

<tab label='ecs-exec.ts'>

<<< files/ecs-exec.ts

</tab>
</tabs>

These extensions serve the following purpose:

- `DurableVolume` - This extension configures an Elastic File System and attaches it to the ECS task
- `StaticScale` - This extension scales the service to a static size of two deployed tasks
- `Exec` - This extension enables ECS Exec so that we can open an interactive shell to a container in a task

#### Create the CDK App

Now create the following file to define the basic CDK application:

<<< files/index.ts

This file attaches the service extensions to a `ServiceDescription` and launches it into a `Service` running inside of an `Environment`.

#### Deploy it all

Once you have all the files setup, it is time to deploy them. Use the following commands to preview and then deploy the CDK application:

```shell
npx cdk diff
npx cdk deploy
```

Once the CDK deploy completes you will see CDK output a URL that looks similar to this:

```txt
Outputs:
efs-sample.ecssampleloadbalancerdnsoutput = efs-s-ecssa-FM5O3208L1OY-1442904617.us-east-2.elb.amazonaws.com
```

You can load this URL up in your browser to verify that the application is running. All you should see at this point is an Amazon ECS logo though.

#### Hydrate the durable storage volume

Right now the durable storage volume is attached to `/srv` inside of the container and it is empty. Let's fix that.

Run the following command locally to open a shell to an running instace of the container. Note that you will need to open up the AWS ECS console to locate the cluster name and the ID of a running task from the service:

```shell
aws ecs execute-command \
  --cluster <insert cluster name here> \
  --task <insert task ID here> \
  --container app \
  --interactive \
  --command "/bin/sh"
```

::: tip
If you get an error that says `SessionManagerPlugin is not found`, please [install the Session Manager plugin for AWS CLI](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html).
:::

Once the shell opens you can start to run commands inside of the remote container. Use the following commands to create an `index.html` file inside of the `/srv` folder that is the durable filesystem volume:

```shell
cd /srv
echo "Hello world" > index.html
```

If you would like to, you can open a second shell to the second container now and verify that the content has been synced over to the second container.

#### Move the volume into place

Now that the durable volume is hydrated with some content, we can move it into place inside of the image so that you see that content when you load up the URL of the service. Update `index.ts` by changing the `DurableStorage` extension configuration to look like this:

```ts
description.add(new DurableVolume({
  path: '/usr/share/nginx/html',
  readonly: false
}));
```

Then rerun the following commands:

```shell
npx cdk diff
npx cdk deploy
```

This is redeploying the service, with the persistent storage volume attached to the web server hosting path. When the deployment completes you can load up the URL of the service in your browser, refresh once or twice to clear the browser cache, and you will see a "Hello world" message instead of the Amazon ECS logo.

At this point you can do live edits to the contents EFS volume and those changes will sync to the web server instances automatically. You can also stop and restart the web server instances and your changes to the durable volume will be persisted.

#### Tear it down

When you are done experimenting you can destroy the created resources with the following command:

```shell
npx cdk destroy
```

::: warning
After the CDK destroy has completed you must go to the [Amazon EFS console](https://console.aws.amazon.com/efs/home?#/file-systems) to delete the elastic filesystem. By default, CDK does not destroy filesystems or other stores of durable state, in order to avoid accidental data loss.
:::
