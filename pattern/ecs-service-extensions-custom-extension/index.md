---
title: Build a custom ECS Service Extension in CDK
description: >-
  How to build a reusable ECS configuration using the CDK package
  ECS Service Extensions
filterDimensions:
  - key: tool
    value: cdk
  - key: type
    value: pattern
authors:
  - peckn
date: April 20 2023
---

#### About

The [`ecs-service-extensions`](https://www.npmjs.com/package/@aws-cdk-containers/ecs-service-extensions) package is an extendable plugin system for defining Amazon ECS service deployments in AWS Cloud Development Kit (CDK).

Amazon ECS has a large configuration area, and many different features that can be configured. The goal of ECS Service Extensions is to make smaller, reusable chunks of declarative CDK configuration that can be applied to your service in layers.

You are able to add as many extensions to an ECS service as you want. Extensions layer on one by one to create a full featured service with exactly the features and behaviors that you want.

#### Extension Philosophy

Each ECS Service Extension is designed to be a self contained, self describing noun that sets up it's own end to end configuration across multiple levels of the CDK infrastructure as code.

If you are familiar with frontend HTML and CSS development, then think of ECS Service Extensions as a CSS framework for cloud resources. In the world of frontend development you might use declarative CSS styles that help you layer behavior onto a generic DOM element:

```html
<div class='flex-wrapper rounded-corners primary-color'></div>
```

By coding the CSS class once, you can then reuse that class across as many DOM elements as you want. Additionally, people who aren't as good at CSS can pull in and use these prebuilt styles on their DOM elements without necessarily understanding all the magic that makes them work under the hood.

Think of ECS Service Extensions as CSS classes that you can add onto your ECS service, like this:

```ts
const description = new ServiceDescription();

description.add(new SpikyCpuScalingPolicy())
description.add(new CloudWatchAgentSidecar())
description.add(new TaskSize(Size.LARGE))
description.add(new HealthCheckTrafficPort())
description.add(new LongStartupGracePeriod())
```

Some extensions come built-in to ECS Service Extensions. For example one built-in extension that ships with the project is `HttpLoadBalancerExtension`. This extension will create a load balancer, modify the container port mappings in the task definition, and configure the ECS service and security group to allow traffic between the load balancer and instances of the task. Rather than needing to adjust configuration in multiple places, across multiple AWS resources you can make a single SDK call:

```ts
description.add(new HttpLoadBalancerExtension());
```

Although ECS Service Extensions ships with a few prepared extensions, one of the core philosophies behind the project is that you can and should build your own custom extensions for your own needs. You may choose to build these extensions in a generic way, and share these extension publically as open source code for others to benefit from. Or you may choose to implement specialized extensions for your own use and keep them private within your own internal organization.

Either way, collecting a library of reusable extensions enables you to build ECS services faster, in a declarative fashion, while having centralized control over commonly used settings. When properly deployed you can update an extension after the fact so that all consumers of the extension are updated.

#### ECS Service Extension API

All service extensions are instances of the `ServiceExtension` abstract class that ships inside of ECS Service Extensions. This abstract class provides hooks that you can implement with your own code to mutate an ECS task definition or ECS service.

The custom hooks will be called at different points in the Cloud Development Kit synthesis lifecycle in order to give each extension the ability to mutate the results of CDK synthesis. The final result of running all hooks from all extensions is a fully defined ECS task definition and service built out of the layers of mutations from each declarative extension.

You can use the following API hooks to build your own custom extensions.

#### Hook: `modifyTaskDefinitionProps()`

An extension may wish to modify the properties of the [`ecs.TaskDefinitionProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.TaskDefinitionProps.html#cpu), prior to the creation of the ECS task definition.

For example the following extension implements an interface for enforcing three standardized ECS task sizes for your company.

<<< files/task-size.ts

Now this reusable extension can be imported and added to any service in order to resize the task:

```ts
myServiceDescription.add(new TaskSize(Size.LARGE));
```

Because the defintion of `Size.LARGE` is centrally defined within the custom `TaskSize` extension you can adjust how much CPU and memory comes from `Size.LARGE` later on, and all consumers of the extension will receive the update. For example maybe you decide later on that `Size.LARGE` is costing too much on the monthly bill so you adjust the CPU of that size downward. Or you notice the `Size.SMALL` is not performing well, so you adjust the CPU and memory values for that size up.

Keeping the extension as a declarative noun with an internally flexible configuration allows developers to use the extension in a way that can be readjusted later as needed.

#### Hook: `useTaskDefinition()`

Some extensions may wish to use the [`ecs.TaskDefinition`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.TaskDefinition.html) construct after it has been instantiated. This hook is primarily used for two reasons:

* Calling [`TaskDefinition.addContainer()`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.TaskDefinition.html#addwbrcontainerid-props) to inject a sidecar into the task.
* Using [`TaskDefinition.taskRole`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.TaskDefinition.html#taskrole-1) to add IAM permissions to an instantiated task.

To demonstrate, let's say that you want to add the CloudWatch agent as a sidecar to all tasks. The following extension adds the CloudWatch Agent container to your task, and it also adds an IAM policy to your task that allows the CloudWatch Agent to communicate with CloudWatch:

<<< files/cloudwatch-agent.ts

Now anyone who wants the CloudWatch agent in their task can use the extension to auto inject the sidecar and setup the right permissions in one statement:

```ts
myServiceDescription.add(new CloudWatchAgentSidecar());
```

Once again, because you own the custom `CloudWatchAgentSidecar` extension you can modify it to set the CloudWatch agent configuration centrally. For example, let's say you want to start collecting some extra metric dimensions. You can modify the `CW_CONFIG_CONTENT` structure inside of the extension and all consumers of your `CloudWatchAgentSidecar` extension will receive the configuration update the next time they deploy.

#### Hook: `modifyServiceProps()`

This hook is for extensions that wish to modify the initial values of
[`ecs.Ec2ServiceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.Ec2ServiceProps.html) or [`ecs.FargateServiceProps`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.FargateServiceProps.html) prior to the creation of the ECS service.

As an example here is a custom extension that gives the ECS service a long grace period on startup:

<<< files/long-startup-grace-period.ts

Consumers of this example extension can add this behavior to their service like this:

```ts
myServiceDescription.add(new LongStartupGracePeriod());
```

As with the other example extensions on this page, you will note that the extension keeps itself as a simple, declarative noun, with no input values. Instead the grace period duration is embedded within the extension. This allows a platform administrator to easily adjust the grace period for all consumers of the extension by updating the code of this `LongStartupGracePeriod` extension.

#### Hook: `useService()`

Extensions that wish to use the [`ecs.Ec2Service`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.Ec2Service.html) or [`ecs.FargateService`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.FargateService.html) construct after it has been instantiated, can implement this hook. This hook gives the extension a chance to call methods that are built-in on the ECS Service's CDK construct.

For example, here is an extension that implements a custom autoscaling policy for the service:

<<< files/spiky-autoscaling-policy.ts

This example extension is called `SpikyCpuScalingPolicy` and it tries to keep the CPU utilization at around 50%, so that there is plenty of overhead CPU in case of an incoming spike of requests. You can imagine that it would be possible to create a `BudgetCpuScalingPolicy` that tries to keep CPU utilization above 90% in order to save money. Creators of an ECS service can consume extensions based on the name of the behavior they would like to add to the service, without needing to know or understand the underlying numbers and implementation behind the extension.

#### Hook: `addHooks()`

Some extensions may wish to mutate the containers that have been
defined by other extensions, including the main application container
that was created by adding the built-in `Container` extension to the `ServiceDescription`.

This can be accomplished by building an extension that implements the `addHooks()` method, and injects a `ContainerMutatingHook` into the `Container` extension. The `ContainerMutatingHook` gets passed the container's proposed [`ecs.ContainerDefinitionOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.ContainerDefinitionOptions.html). The hook has a chance to mutate the container options prior to the container being added to the ECS task definition.

For example, let's say that you wanted to configure a healthcheck on the main container of the application. Here is how you might create a `HealthCheckTrafficPort` extension:

<<< files/healthcheck-traffic-port.ts

The extension defines a container mutating hook which takes an existing container definition and modifies it to have a Docker healthcheck which verifies that the container is accepting traffic on a given port.

The extension then activates that hook by implementing the `addHooks()` method. When the `addHooks()` method is called it uses the `ServiceExtension.addContainerMutatingHook()` to attach it's own mutating hook to the main application container.

Once again you will notice that as a best practice the `HealthCheckTrafficPort` extension does not accept any input values. You add it to a description by simply saying:

```ts
myServiceDescription.add(new HealthCheckTrafficPort());
```

The extension can determine the traffic port to run health checks against by reading properties from the `Container` extension, and it is therefore able to configure itself without any further input from the user. This makes the extension opinionated but also reliably self configuring.

#### Hook: `resolveContainerDependencies()`

This hook is for extensions that want to modify container dependencies within the task definition. The hook is run after all extensions have added their containers to the task. The main reason for this hook is so that extensions can call [`ecs.ContainerDefinition.addContainerDependencies()`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs.ContainerDefinition.html#addwbrcontainerwbrdependenciescontainerdependencies) in order to control the startup order of containers.

For example, in the CloudWatch Agent extension example above, let's say you wanted to ensure that the custom CloudWatch Agent always starts before the application container. You could add the following hook into the `CloudWatchAgentSidecar` extension:

```ts
public resolveContainerDependencies() {
  const serviceExtension = this.parentService.serviceDescription.get('service-container');
  if (serviceExtension && serviceExtension.container) {
    serviceExtension.container.addContainerDependencies({
      container: this.container,
      condition: ecs.ContainerDependencyCondition.START,
    });
  }
}
```

Now the `CloudWatchAgentSidecar` adds itself as a dependency on the main service container. Amazon ECS will see this dependency, and wait for the CloudWatch agent sidecar to start up first, before starting the main application container.

#### Put it all together

Now that you have learned about the different hooks available, and seen many examples of custom service extensions, let's see how it looks when you put all the custom extensions from above together in one application:

<<< files/index.ts

The CDK app can import each individual extension, and then use `.add()` statements to attach all the extensions to the service:

```ts
description.add(new SpikyCpuScalingPolicy())
description.add(new CloudWatchAgentSidecar())
description.add(new TaskSize(Size.LARGE))
description.add(new HealthCheckTrafficPort())
description.add(new LongStartupGracePeriod())
```

Test out the synthesis by running:

```sh
npm run cdk -- synth --yaml --version-reporting=false --path-metadata=false
```

This will output the generated CloudFormation in YAML format. Look for the `AWS::ECS::TaskDefinition` resource in this generated YAML. It should look something like this:

```yaml
testservicetaskdefinition4C7A523E:
  Type: AWS::ECS::TaskDefinition
  Properties:
    ContainerDefinitions:
      - Cpu: 1024
        Environment:
          - Name: PORT
            Value: "80"
        Essential: true
        HealthCheck:
          Command:
            - CMD-SHELL
            - curl localhost:80
          Interval: 5
          Retries: 2
          StartPeriod: 20
          Timeout: 5
        Image: public.ecr.aws/nginx/nginx
        Memory: 2048
        Name: app
        PortMappings:
          - ContainerPort: 80
            Protocol: tcp
        Ulimits:
          - HardLimit: 1024000
            Name: nofile
            SoftLimit: 1024000
      - Environment:
          - Name: CW_CONFIG_CONTENT
            Value: '{"logs":{"metrics_collected":{"emf":{}}},"metrics":{"metrics_collected":{"statsd":{}}}}'
        Essential: true
        Image: public.ecr.aws/cloudwatch-agent/cloudwatch-agent:latest
        LogConfiguration:
          LogDriver: awslogs
          Options:
            awslogs-group:
              Ref: testservicetaskdefinitioncloudwatchagentLogGroup5D94F4ED
            awslogs-stream-prefix: cloudwatch-agent
            awslogs-region:
              Ref: AWS::Region
        MemoryReservation: 50
        Name: cloudwatch-agent
        User: 0:1338
    Cpu: "2048"
    ExecutionRoleArn:
      Fn::GetAtt:
        - testservicetaskdefinitionExecutionRoleCD18B710
        - Arn
    Family: customecsserviceextensiontestservicetaskdefinition216EC511
    Memory: "4096"
    NetworkMode: awsvpc
    RequiresCompatibilities:
      - EC2
      - FARGATE
    TaskRoleArn:
      Fn::GetAtt:
        - testservicetaskdefinitionTaskRoleD4F1D568
        - Arn
```

You can see that this YAML definition is quite a bit more complex compared to the 5 lines of TypeScript above. The advantage of using ECS Service Extensions is that you write concise, human readable declarations of the desired behavior, and no longer have to write the entire API spec to make it happen.

This value becomes even more clear when you look at the generated YAML document as a whole, across the `AWS::ECS::Service` resource, the `AWS::IAM::Role` resources, and other configurations throughout the CloudFormation template. In many cases an extension has mutated multiple different CloudFormation resources at different levels, at the same time. But you can easily remove all those mutations from the CloudFormation at once by simply commenting out the extension and running `cdk synth` again.

This is superior compared to manually hunting through the task definition resource, ECS service configuration resource, and IAM role resource in order to find all the configurations that need to be removed in order to cleanly disable a feature.

#### Deploy and Cleanup

You can use Amazon Cloud Development Kit to deploy the application with:

```sh
npm run-script cdk deploy
```

And you can teardown the deployment with:

```sh
npm run-script cdk destroy
```

#### Next Steps

- Read the [official launch blog for ECS Service Extensions](https://aws.amazon.com/blogs/containers/general-availability-amazon-ecs-service-extensions-for-aws-cdk/)
- Read through the [repository for ECS Service Extensions](https://github.com/cdklabs/cdk-ecs-service-extensions)
- Check out the [built-in AWS FireLens extension](/ecs-service-extensions-firelens-cdk)
- See how to use the built-in [HTTP Load balancer extension](/ecs-service-extensions-load-balancer-cdk)
- See an example of how to [attach an EFS File System volume to a task using ECS Service Extensions](/ecs-service-extensions-cdk-efs-volume)