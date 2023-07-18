# ApiGatewayLoadBalancedFargateService

Amazon API Gateway allows you to integrate with VPC link and route traffic to services in VPC through Cloud Map, Application Load Balancers(ALB) or Network Load Balancers(NLB).

This constructs provisions API Gateway HTTP API with Fargate service and route the traffic throught a VPC link. By default, the `vpcLinkIntegration` type is Cloud Map and no ALB or NLB will be created.

The default capacity provider strategy for the service is:

```ts
[
  { capacityProvider: 'FARGATE_SPOT', base: 2, weight: 50 },
  { capacityProvider: 'FARGATE', weight: 50 },
]
```
This means the first 2 tasks will always be `FARGATE_SPOT` and 50-50 afterwards. You can customize that in the `capacityProviderStrategies` property.


<img src=./diagram.svg>

## Example

```ts
const vpc = new ec2.Vpc(stack, 'Vpc', { natGateways: 1 });
const cluster = new ecs.Cluster(stack, 'Cluster', { vpc });
const taskDefinition = new ecs.FargateTaskDefinition(stack, 'Task', {
  memoryLimitMiB: 512,
  cpu: 256,
});

taskDefinition.addContainer('nyancat', {
  image: ecs.ContainerImage.fromRegistry('public.ecr.aws/pahudnet/nyancat-docker-image:latest'),
  portMappings: [{ containerPort: 80, name: 'default' }],
  healthCheck: {
    command: ['CMD-SHELL', 'curl -f http://localhost/ || exit 1'],
  },
});

new ApiGatewayLoadBalancedFargateService(stack, 'DemoService', {
  vpc,
  cluster,
  taskDefinition,
  vpcLinkIntegration: VpcLinkIntegration.CLOUDMAP,
});
```

## Deploy the sample workload

```ts
$ yarn install
$ npx cdk diff
$ npx cdk deploy
```

## Destroy the sample workload

```ts
$ npx cdk destroy
```

