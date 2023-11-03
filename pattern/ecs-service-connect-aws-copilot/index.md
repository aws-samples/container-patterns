---
title: Service to service communication with AWS Copilot
description: >-
  How to use AWS Copilot to configure service to service communication using ECS Service Connect
filterDimensions:
  - key: tool
    value: copilot
  - key: type
    value: tutorial
  - key: capacity
    value: fargate
  - key: feature
    value: service-connect
authors:
  - peckn
date: April 21 2023
alternatives:
  - key: feature
    value: cloudmap
    id: service-discovery-fargate-microservice-cloud-map
    description: Cloud Map based service discovery gives you a more direct, more customizable way to do direct
      peer to peer communciations between containers. Although more complex to use, you may prefer Cloud Map
      based service discovery if you want more control over retry behaviors and traffic shaping and routing.
---

#### About

[AWS Copilot](https://aws.github.io/copilot-cli/) is the official command line tool for Amazon ECS. It helps you to build and deploy your containers using production ready patterns curated by the AWS team.

[Amazon ECS Service Connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html) provides management of service-to-service communication as Amazon ECS configuration. It does this by building both service discovery and a service mesh in Amazon ECS.

This pattern shows how to use AWS Copilot to configure ECS Service Connect for service to service communication within your cluster.

#### The sample application

This pattern will deploy a sample application called `greeter-application`. It consists of three microservices:

- `name` service. This service returns a random name
- `greeting` service. This service returns a random greeting
- `greeter` service. This service fetches a random name from `name` service, and a random greeting from `greeting` service, and then it greets the user.

The following diagram shows how the services will connect together in a service mesh:

!!! @/pattern/ecs-service-connect-aws-copilot/service-connect-diagram.svg

Each service task will be accompanied by an Envoy Proxy sidecar that is managed by Amazon ECS Service Connect. The Envoy Proxy handles all internal traffic for service to service communication by automatically routing requests to instances of downstream tasks, based on the service discovery name. Incoming internet traffic from the external public is handled via an Application Load Balancer which serves as the ingress.

Let's see how to deploy this using AWS Copilot.

#### Install AWS Copilot

You can install AWS Copilot on macOS using Homebrew:

```shell
# Install
brew install aws/tap/copilot-cli

# Verify installation
copilot --version
```

Or see [installation instructions for other systems](https://aws.github.io/copilot-cli/docs/getting-started/install/) in the AWS Copilot docs.

#### Clone the sample repository

This pattern uses a sample two tier application called "greeter". The application is made up of three microservice components:

- `name` - This service returns a random name
- `greeting` - This service returns a random greeting
- `greeter` - This front facing service constructs a greeting phrase from the name and greeting fetched from the other two services.

```shell
git clone git@github.com:nathanpeck/greeter.git
cd greeter
```

#### Setup name service

Start a new Copilot application by running:

```shell
copilot init
```

If asked `Would you like to use one of your existing applications? (Y/n)` type `n` for "no".

The next step is to choose a name for your application. Type `greeting-application`:

```
Use existing application: No

  Ok, let's create a new application then.
  What would you like to name your application? [? for help] greeting-application
```

At the next prompt use the arrow keys to choose `Backend Service`:

```
  Which workload type best represents your architecture?  [Use arrows to move, type to filter, ? for more help]
    Request-Driven Web Service  (App Runner)
    Load Balanced Web Service   (Internet to ECS on Fargate)
  > Backend Service             (ECS on Fargate)
    Worker Service              (Events to SQS to ECS on Fargate)
    Scheduled Job               (Scheduled event to State Machine to Fargate)
```

This service will not be internet facing, but it will be accessible in the Service Connect service mesh, for usage by other ECS services.

Next you will be asked what you would like to call your service. Type `name-service`:

```
What do you want to name this service? [? for help] name-service
```

AWS Copilot will ask you which `Dockerfile` you would like to deploy. Use the arrow keys to select `name/Dockerfile`:

```
Which Dockerfile would you like to use for name-service?  [Use arrows to move, type to filter, ? for more help]
    greeter/Dockerfile
    greeting/Dockerfile
  > name/Dockerfile
    Enter custom path for your Dockerfile
    Use an existing image instead
```

::: info
If you don't see any Dockerfile's listed make sure you have navigated your command line shell into the sample code folder with `cd greeter` first, before running `copilot init`
:::

Copilot will begin by creating supporting infrastructure for the application, during which you will see output similar to this:

```
- Creating the infrastructure for stack greeting-application-infrastructure-roles               [create complete]  [34.4s]
  - A StackSet admin role assumed by CloudFormation to manage regional stacks                   [create complete]  [14.3s]
  - An IAM role assumed by the admin role to create ECR repositories, KMS keys, and S3 buckets  [create complete]  [14.1s]
✔ The directory copilot will hold service manifests for application greeting-application.

✔ Wrote the manifest for service name-service at copilot/name-service/manifest.yml
Your manifest contains configurations like your container size and port (:3000).

- Update regional resources with stack set "greeting-application-infrastructure"  [succeeded]  [0.0s]
All right, you're all set for local development.
```

Next Copilot will ask if you you'd like to deploy a test environment. Type `y` for "yes":

```
Would you like to deploy a test environment? [? for help] (y/N)
```

While the service deploys let's take a look at the generated service's
configuration at `copilot/name-service/manifest.yml`:

<<< files/copilot/name-service/manifest.yml

Some things to note:

- `network.connect == true` - ECS Service Connect is enabled by default. The service will be accessible at `name-service:3000` within the service mesh.

#### Setup greeting service

Now let's add the greeting service to the cluster:

```shell
copilot svc init
```

Once again we need to pick `Backend Service` for the `greeting` service:

```
  Which service type best represents your service's architecture?  [Use arrows to move, type to filter, ? for more help]
    Request-Driven Web Service  (App Runner)
    Load Balanced Web Service   (Internet to ECS on Fargate)
  > Backend Service             (ECS on Fargate)
    Worker Service              (Events to SQS to ECS on Fargate)
```

When asked for the service name type `greeting-service`:

```
What do you want to name this service? [? for help] greeting-service
```

And when asked which image to deploy choose `greeting/Dockerfile`:

```
  Which Dockerfile would you like to use for greeting-service?  [Use arrows to move, type to filter, ? for more help]
    greeter/Dockerfile
  > greeting/Dockerfile
    name/Dockerfile
    Enter custom path for your Dockerfile
    Use an existing image instead
```

Now we can use the suggested deployment command to build and deploy the `greeting` service:

```shell
copilot svc deploy --name greeting-service --env test
```

After the deployment completes you can see what the Service Connect name is:

```
Recommended follow-up action:
  - You can access your service at greeting-service:3000 with service connect.
```

#### Setup the greeter application

The code for the `greeter` application expects to have two environment variables available:

- `GREETING_URL` - The Service Connect URL `http://greeting-service:3000`
- `NAME_URL` - The Service Connect URL `http://name-service:3000`

To kick things off we need to initialize the new `greeter` service:

```
copilot svc init
```

Because this service is public facing, this time we will choose `Load Balanced Web Service`:

```
  Which service type best represents your service's architecture?  [Use arrows to move, type to filter, ? for more help]
    Request-Driven Web Service  (App Runner)
  > Load Balanced Web Service   (Internet to ECS on Fargate)
    Backend Service             (ECS on Fargate)
    Worker Service              (Events to SQS to ECS on Fargate)
```

Name the service `greeter-service`:

```
  What do you want to name this service? [? for help] greeter-service
```

And choose the `greeter/Dockerfile`:

```
  Which Dockerfile would you like to use for greeter-service?  [Use arrows to move, type to filter, ? for more help]
  > greeter/Dockerfile
    greeting/Dockerfile
    name/Dockerfile
    Enter custom path for your Dockerfile
    Use an existing image instead
```

Before deploying the `greeter` service we need to edit the file `copilot/greeter-service/manifest.yml`:

```yaml
# Optional fields for more advanced use-cases.
# Pass environment variables as key value pairs.
variables:
  GREETING_URL: http://greeting-service:3000
  NAME_URL: http://name-service:3000
```

This section of the file will tell Copilot to setup the ECS task definition with these environment variables that the code is looking for.

Now everything is ready to deploy:

```shell
copilot svc deploy --name greeter-service --env test
```

Once the `greeter` service is deployed you will see the load balancer URL for the public facing endpoint:



#### Test it out

Send a series of 10 requests to the `greeter` service's public facing load balancer URL. You can use a command similar to this, with your own deployment's URL:

```shell
for i in {1..10}; do curl greet-publi-ihsqtr4pnwn4-2005154246.us-east-2.elb.amazonaws.com; echo; done
```

You will see output similar to this:

```
From ip-10-0-1-19.us-east-2.compute.internal: Hello (ip-10-0-1-252.us-east-2.compute.internal) Emelia (ip-10-0-0-31.us-east-2.compute.internal)
From ip-10-0-1-19.us-east-2.compute.internal: Hi (ip-10-0-1-252.us-east-2.compute.internal) Mavis (ip-10-0-0-31.us-east-2.compute.internal)
From ip-10-0-1-19.us-east-2.compute.internal: Hello (ip-10-0-1-252.us-east-2.compute.internal) Darwin (ip-10-0-0-31.us-east-2.compute.internal)
From ip-10-0-1-19.us-east-2.compute.internal: Greetings (ip-10-0-1-252.us-east-2.compute.internal) Kenna (ip-10-0-0-31.us-east-2.compute.internal)
From ip-10-0-1-19.us-east-2.compute.internal: Hello (ip-10-0-1-252.us-east-2.compute.internal) Jamaal (ip-10-0-0-31.us-east-2.compute.internal)
From ip-10-0-1-19.us-east-2.compute.internal: Greetings (ip-10-0-1-252.us-east-2.compute.internal) Emerson (ip-10-0-0-31.us-east-2.compute.internal)
From ip-10-0-1-19.us-east-2.compute.internal: Greetings (ip-10-0-1-252.us-east-2.compute.internal) Margot (ip-10-0-0-31.us-east-2.compute.internal)
From ip-10-0-1-19.us-east-2.compute.internal: Greetings (ip-10-0-1-252.us-east-2.compute.internal) Dominic (ip-10-0-0-31.us-east-2.compute.internal)
From ip-10-0-1-19.us-east-2.compute.internal: Greetings (ip-10-0-1-252.us-east-2.compute.internal) Rowena (ip-10-0-0-31.us-east-2.compute.internal)
From ip-10-0-1-19.us-east-2.compute.internal: Hey (ip-10-0-1-252.us-east-2.compute.internal) Ross (ip-10-0-0-31.us-east-2.compute.internal)
```

If you would like to further test out the service mesh, then try editing the `copilot/<service-name>/manifest.yml` files to set `count: 2`. Then run `copilot deploy` to deploy the scale up configuration to each service. By scaling out the deployment you will be able to see how the service mesh load balances requests across all available tasks within the cluster.

Additionally, as you send traffic to the front facing `greeter` application, and it sends traffic to the underlying `name` and `greeting` applications you will be able to see HTTP stats in the "Health and metrics" tab of the service details page. These stats originate from the Envoy proxy sidecar, which is tracking all the connections and HTTP stats for the service mesh.

#### Tear it down

When you are done with testing out Service Connect across the microservices you can run `copilot app delete` to automatically tear down all the services and application resources.