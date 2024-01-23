---
title: Advanced Techniques for Amazon ECS Container Health Checks
description: >-
  Improve ECS container health checks. Best practices for logs, security, customization. Enhance workload availability monitoring.
filterDimensions:
  - key: type
    value: pattern
  - key: capacity
    value: fargate
  - key: capacity
    value: ec2
  - key: capacity
    value: anywhere
  - key: app
    value: worker
authors:
  - cssntan
  - opomer
date: Jan 22, 2024
---

## Introduction

Amazon Elastic Container Service (Amazon ECS) provides a container health check feature that allows you to define health checks for your containerized workloads. This health check runs locally on the container instance or Fargate hosting your ECS task. It checks whether your application running in the container is available and responding as expected.

The container health check provides visibility into the availability of your application from the instance level. However, it does not monitor external network availability or other components of your architecture. As David Yanacek points out, [health checks can be implemented at multiple levels of your architecture](https://aws.amazon.com/builders-library/implementing-health-checks/).

In this pattern, we dive into best practices around leveraging ECS container health checks:

- Improving visibility into the health check process
- Enhancing the security posture of your health checks
- Extending health checks by building a dedicated health check utility as part of your existing Amazon ECS Task.

The goal is to provide guidelines to help you effectively utilize ECS container health checks for monitoring workload availability.

## Container Health Checks

Amazon ECS supports defining container health checks in task definitions. Health checks are commands or scripts that run locally within a container to validate application health and availability.

When a health check is defined in a task definition, the container runtime will execute the health check process inside the container and evaluate the exit code to determine the application health. If the health check fails consistently, ECS will mark the container and task as unhealthy and take remediation actions if the task is part of a service.

Because health checks execute inside the container, any tools used such as `curl` must be included in the container image. The health check reaches the application via the container's loopback interface at `localhost` or `127.0.0.1`.

!!! @/pattern/ecs-advanced-container-health-check/files/ecscontainerhealthcheck.png

The example below shows a task definition with a health check defined to run `curl` against the nginx web server running in the same container:

<<< @/pattern/ecs-advanced-container-health-check/files/simple-container-definition.json

In this health check, `curl` will be executed against http://localhost/ inside the container. The `curl` binary must be included in the container image, as is the case in the official nginx image. 

The `||` [bash operator means](https://www.gnu.org/software/bash/manual/bash.html) that if `curl` returns a non-zero exit code, indicating it was unable to reach the web server, the second `exit 1` command will execute instead. ECS counts non-zero exit codes from the health check as failures.

Based on the `retries` count, if ECS receives 3 consecutive health check failures, the container will be marked as unhealthy. If any essential container in a task is unhealthy, the entire task is marked unhealthy. For tasks that are part of an ECS service, unhealthy tasks will automatically be replaced.

While simple health checks can be useful, the example above has some drawbacks:

- Health check output is not visible in ECS console or APIs, limiting observability.
- Including additional binaries like `curl` in container images goes against security best practices of reducing the container attack surface area.

## Optimizing the container health check

This pattern will provide multiple examples on how container health checks can be optimized in Amazon ECS.

### Capturing the output of the health check process

#### Overview

When defining a container in an Amazon ECS task definition, you can specify a logging driver such as Amazon CloudWatch Logs. This logging driver captures the stdout and stderr streams from the container and forwards them to a central logging service. However, Amazon ECS does not capture the output of the health check process by default. You can optimize your health checks by forwarding the health check output to the stdout/stderr streams of your application. This allows the logging driver to collect the health check output.

#### Solution

The example below shows how to redirect the health check output so that it is forwarded to the central logging service. This builds on the first example task definition by routing the health check output to the first process in the container using `>> /proc/1/fd/1`. It also ensures both stdout and stderr are captured using `2>&1`.

```json
 “healthCheck": {
   "command": [
     "CMD-SHELL",
     "curl -f http://localhost/ >> /proc/1/fd/1 2>&1  || exit 1"
   ],
   …
}
```

By routing the health check output to the application stdout/stderr streams, the configured logging driver can pick up this output and forward it to the central logging server. This provides observability into the health checks results. 

### Capturing and annotating the output of the health check process

#### Overview

Our health check process outputs debug information that gets logged, but this results in noisy and hard to parse logs. We want to transform the output to only include relevant data like status codes and timestamps.

#### Solution

We can encapsulate the health check logic in a bash script called `healthcheck.sh`. This allows us to process the raw output and format it before logging. For example, the script can:

- Execute the health check curl command
- Extract and set key variables like HTTP status codes
- Construct log messages including relevant metadata  
- Print the log output to stdout for the logging driver

Here is an example `healthcheck.sh` script that implements this:

<<< @/pattern/ecs-advanced-container-health-check/files/healthcheck.sh

To implement this, the `curl` command in the health check definition needs to be replaced with a call to the bash script. 

```json
“healthCheck": {
   "command": [
     "CMD-SHELL",
     "/healthcheck.sh >> /proc/1/fd/1"
   ],
   …
}
```

::: warning
The healthscript.sh file must be copied to the container image.
:::

Now the script will handle executing the health check, and will send the output to the stdout/stderr streams which get captured in the log stream. The resulting logs will only contain relevant information and metadata, easy to parse and troubleshoot.

Wrapping health checks in this bash script allows container logs to be more useful for diagnosing issues, by filtering noise and annotating the output. 


### Reducing the attack surface of a container image

#### Overview

When securing a container image, it's best practice to reduce the attack surface by removing non-required components like binaries, libraries, and shells. These components could potentially be leveraged by an attacker to exploit the container. Some container security tools may flag the inclusion of bash and curl as risks. To remove these while still providing a health check, a container health check process can be implemented in a module or binary.


To reduce the number of additional packages in the container image, build the health check using the same runtime environment as the application. For example, if the container runs a Python web application, implement the health check as a Python script that reuses the existing Python interpreter. The script can use Python's requests module to check the application's health, eliminating the need to include bash, curl, or other tools solely for the health check. This approach streamlines the container image by leveraging the application's existing dependencies.

#### Solution

A healthcheck.py script can leverage the requests library to query the app similar to a curl bash script, but more secured:

<<< @/pattern/ecs-advanced-container-health-check/files/healthcheck.py

This removes non-required attack surfaces while still providing a health check. 

A similar approach can be taken for other languages like Golang:

<<< @/pattern/ecs-advanced-container-health-check/files/healthcheck.go

## Conclusion

In this post, we demonstrated the health check options that you can configure on Amazon ECS tasks. We discussed advanced scenarios where you can set up the container health check to send logs to CloudWatch Logs. This provides more detailed information about why Amazon ECS tasks become unhealthy. We also covered two approaches to implement custom health checks - using the container command or application code. These allow you to evaluate container health in an advanced way.
