---
title: Amazon ECS task definition with a custom entrypoint command
description: >-
  How to run a custom command inside of a container image. How to override the default entrypoint, and pass custom parameters to the entrypoint.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: app
    value: batch
authors:
  - peckn
date: April 4 2023
---

The following snippets show how to create a task definition which runs a custom command when the container image starts up. This can be especially useful when overriding the existing entrypoint command in a generic image, such as when running a background batch job.

#### Example: Custom Alpine image to run `ping`

The following task defintions launch a standard [Alpine Linux container](https://gallery.ecr.aws/docker/library/alpine) and the task definition tells ECS to run the `ping` command inside the container:

<tabs>

<tab label='AWS CloudFormation'>

<<< files/task-definition.yml

Deploy the CloudFormation template above by using the AWS CloudFormation web console.
Alternatively you can deploy from the command line with:

```sh
aws cloudformation deploy \
   --stack-name sample-task-definition \
   --template-file task-definition.yml
```

</tab>

<tab label='Raw JSON'>

<<< files/task-definition.json

In the ECS console, click "Create new task definition with JSON" and paste the
JSON into the task definition editor.

Alternatively you can download the JSON file and pass it as a parameter to the AWS CLI:

```sh
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```

</tab>

</tabs>

#### Example: Custom load test container

With this snippet you can create a custom load test container that utilizes [`hey`](https://github.com/rakyll/hey) , and then pass commands
to it to configure how many requests to send, and which URL to send them too.

First define a custom image that has the desired entrypoint already set, but no
commands:

```Dockerfile
FROM public.ecr.aws/amazonlinux/amazonlinux:latest
RUN curl https://hey-release.s3.us-east-2.amazonaws.com/hey_linux_amd64 -o /usr/bin/hey && chmod +x /usr/bin/hey
ENTRYPOINT [ "/usr/bin/hey" ]
```

Next create a task definition that keeps the existing entrypoint from the image, but sets a custom command to run against that entrypoint:

<<< files/load-test-task-definition.yml

The resulting task definition can now be launched with ECS `RunTask` API to start a containerized instance of `hey` with the given load test parameters.

#### See Also

- [How to use a custom entrypoint to inject configuration files](/inject-config-files-ecs-task-definition)
