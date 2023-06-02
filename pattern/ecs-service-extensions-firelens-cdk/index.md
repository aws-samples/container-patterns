---
title: AWS FireLens with ECS Service Extensions
description: >-
  Use the ECS Service Extensions package for AWS Cloud Development Kit to easily add FireLens log routing to your container application
filterDimensions:
  - key: tool
    value: cdk
  - key: type
    value: pattern
  - key: feature
    value: aws-firelens
authors:
  - peckn
date: April 20 2023
---

#### About

The [`ecs-service-extensions`](https://www.npmjs.com/package/@aws-cdk-containers/ecs-service-extensions) package is an extendable plugin system for defining Amazon ECS service deployments in AWS Cloud Development Kit. To learn the basics of `ecs-service-extensions` refer to ["Load balanced container service with ECS Service Extensions".](/ecs-service-extensions-load-balancer-cdk)

AWS FireLens is built-in to Amazon ECS to help you get high performance log routing, filtering, and splitting via Fluent Bit. FireLens also enhances your logs with ECS specific metadata such as which task definition version, which cluster, and which task ARN the log originated from. For more info on FireLens read ["Under the hood: FireLens for Amazon ECS Tasks"](https://aws.amazon.com/blogs/containers/under-the-hood-firelens-for-amazon-ecs-tasks/), which goes into depth about FireLens features, with performance benchmark comparisons.

This pattern shows how to use `ecs-service-extensions` to add AWS FireLens to a service, then verify that the logs are being routed with FireLens.

#### Setup Cloud Development Kit

To use this pattern you need TypeScript and Node. First, ensure that you have Node.js installed on your development machine. Then create the following files:

<tabs>
<tab label="package.json">

<<< @/pattern/ecs-service-extensions-firelens-cdk/files/package.json

</tab>

<tab label='tsconfig.json'>

<<< @/pattern/ecs-service-extensions-firelens-cdk/files/tsconfig.json

</tab>

<tab label='cdk.json'>

<<< @/pattern/ecs-service-extensions-firelens-cdk/files/cdk.json

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

#### Create the CDK App

Now create the following file to define a basic CDK application:

<<< @/pattern/ecs-service-extensions-firelens-cdk/files/index.ts

FireLens is added to the deployed application by importing the `FireLensExtension` class, and then calling `ServiceDescription.add()` to add an instance of the `FireLensExtension` to the `ServiceDescription`.

You can preview and then deploy this CDK application by running:

```sh
npm run-script cdk diff
npm run-script cdk deploy
```

#### Verify that it worked

Open the ECS console and find the running task that was launched. Either view the task details in the console or use the AWS CLI to view task details with the following command:

```sh
aws ecs describe-tasks \
   --cluster your-cluster-name-here \
   --tasks your-task-arn-here \
   --query 'tasks[].containers[].{name: name, lastStatus: lastStatus, image: image}'
```

You will see output similar to this:

```json
[
    {
        "image": "nathanpeck/name",
        "lastStatus": "RUNNING",
        "name": "app"
    },
    {
        "image": "906394416424.dkr.ecr.us-east-2.amazonaws.com/aws-for-fluent-bit:latest",
        "lastStatus": "RUNNING",
        "name": "firelens"
    }
]
```

This shows that the FireLens container called `aws-for-fluent-bit` has been launched as a sidecar to accompany your task's application container. Each instance of your application container will be accompanied by a lightweight Fluent Bit process which captures `stdout` and `stderr` logs, attaches metadata to them, and routes the logs to CloudWatch.

You can also view the logs for the Fluent Bit sidecar itself in the ECS console. Look for lines similar to this in the Fluent Bit logs:

```txt
time="2023-04-20T15:30:41Z" level=info msg="[cloudwatch 0] Log stream name/app-firelens-fcfc4e8175d848e496380e8e8de88e47 does not exist in log group name-logs"	firelens
4/20/2023, 11:30:41 AM	time="2023-04-20T15:30:41Z" level=info msg="[cloudwatch 0] Created log stream name/app-firelens-fcfc4e8175d848e496380e8e8de88e47 in group name-logs"
```

FireLens has automatically created a CloudWatch log group for the application, and has begun piping logs into it. Find the referenced log group and open it in CloudWatch to see the logs within. You should see a log output similar to this:

```json
{
    "container_id": "fcfc4e8175d848e496380e8e8de88e47-527074092",
    "container_name": "app",
    "ecs_cluster": "ECSStack-productionenvironmentclusterC6599D2D-oR4P0udMijYx",
    "ecs_task_arn": "arn:aws:ecs:us-east-2:209640446841:task/ECSStack-productionenvironmentclusterC6599D2D-oR4P0udMijYx/fcfc4e8175d848e496380e8e8de88e47",
    "ecs_task_definition": "ECSStacknametaskdefinitionCB1493C3:2",
    "log": "Listening on port 80!",
    "source": "stdout"
}
```

FireLens automatically configures Fluent Bit to attach ECS metadata to each line of log output. You can see whether ECS container logs were written to `stdout` or `stderr`, and you can also see rich information about which ECS task version wrote the log line.

This feature of FireLens can be particularly helpful when you are running many containers, iterating fast on pushing out new feature versions, and want to track an error back to its source.

#### Clean Up

Tear down the CDK application stack with the following command:

```sh
npm run-script cdk destroy
```

#### See Also

- [More examples for AWS FireLens](https://github.com/aws-samples/amazon-ecs-firelens-examples), including advanced logging configurations
- Learn how to [build your own custom ECS Service Extension](/ecs-service-extensions-custom-extension)