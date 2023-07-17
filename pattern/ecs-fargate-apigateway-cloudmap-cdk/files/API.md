# apigateway-patterns

A curated collection of CDK L3 constructs for Amazon API Gateway.


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


<img src=./images/apig-lb-fargate-service.svg>

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


# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### ApiGatewayLoadBalancedFargateService <a name="ApiGatewayLoadBalancedFargateService" id="apigateway-patterns.ApiGatewayLoadBalancedFargateService"></a>

#### Initializers <a name="Initializers" id="apigateway-patterns.ApiGatewayLoadBalancedFargateService.Initializer"></a>

```typescript
import { ApiGatewayLoadBalancedFargateService } from 'apigateway-patterns'

new ApiGatewayLoadBalancedFargateService(scope: Construct, id: string, props: ApiGatewayLoadBalancedFargateServiceProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateService.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateService.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateService.Initializer.parameter.props">props</a></code> | <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps">ApiGatewayLoadBalancedFargateServiceProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="apigateway-patterns.ApiGatewayLoadBalancedFargateService.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="apigateway-patterns.ApiGatewayLoadBalancedFargateService.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="apigateway-patterns.ApiGatewayLoadBalancedFargateService.Initializer.parameter.props"></a>

- *Type:* <a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps">ApiGatewayLoadBalancedFargateServiceProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateService.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="apigateway-patterns.ApiGatewayLoadBalancedFargateService.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateService.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### ~~`isConstruct`~~ <a name="isConstruct" id="apigateway-patterns.ApiGatewayLoadBalancedFargateService.isConstruct"></a>

```typescript
import { ApiGatewayLoadBalancedFargateService } from 'apigateway-patterns'

ApiGatewayLoadBalancedFargateService.isConstruct(x: any)
```

Checks if `x` is a construct.

###### `x`<sup>Required</sup> <a name="x" id="apigateway-patterns.ApiGatewayLoadBalancedFargateService.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateService.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |

---

##### `node`<sup>Required</sup> <a name="node" id="apigateway-patterns.ApiGatewayLoadBalancedFargateService.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---


## Structs <a name="Structs" id="Structs"></a>

### ApiGatewayLoadBalancedFargateServiceProps <a name="ApiGatewayLoadBalancedFargateServiceProps" id="apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps"></a>

#### Initializer <a name="Initializer" id="apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.Initializer"></a>

```typescript
import { ApiGatewayLoadBalancedFargateServiceProps } from 'apigateway-patterns'

const apiGatewayLoadBalancedFargateServiceProps: ApiGatewayLoadBalancedFargateServiceProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.cluster">cluster</a></code> | <code>aws-cdk-lib.aws_ecs.ICluster</code> | The ECS Cluster. |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.taskDefinition">taskDefinition</a></code> | <code>aws-cdk-lib.aws_ecs.TaskDefinition</code> | The ECS task definition of the Fargate service. |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.vpc">vpc</a></code> | <code>aws-cdk-lib.aws_ec2.IVpc</code> | The VPC for the ECS cluster. |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.capacityProviderStrategies">capacityProviderStrategies</a></code> | <code>aws-cdk-lib.aws_ecs.CapacityProviderStrategy[]</code> | The capacity provider strategies for the service. |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.desiredCount">desiredCount</a></code> | <code>number</code> | The desired number of instantiations of the task definition to keep running on the service. |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.discoveryName">discoveryName</a></code> | <code>string</code> | The discovery name of the cloud map service. |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.vpcLinkIntegration">vpcLinkIntegration</a></code> | <code><a href="#apigateway-patterns.VpcLinkIntegration">VpcLinkIntegration</a></code> | The vpc link integration type for the API Gateway private integration. |
| <code><a href="#apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.vpcSubnets">vpcSubnets</a></code> | <code>aws-cdk-lib.aws_ec2.SubnetSelection</code> | subnets for the ecs tasks. |

---

##### `cluster`<sup>Required</sup> <a name="cluster" id="apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.cluster"></a>

```typescript
public readonly cluster: ICluster;
```

- *Type:* aws-cdk-lib.aws_ecs.ICluster

The ECS Cluster.

---

##### `taskDefinition`<sup>Required</sup> <a name="taskDefinition" id="apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.taskDefinition"></a>

```typescript
public readonly taskDefinition: TaskDefinition;
```

- *Type:* aws-cdk-lib.aws_ecs.TaskDefinition

The ECS task definition of the Fargate service.

---

##### `vpc`<sup>Required</sup> <a name="vpc" id="apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc

The VPC for the ECS cluster.

---

##### `capacityProviderStrategies`<sup>Optional</sup> <a name="capacityProviderStrategies" id="apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.capacityProviderStrategies"></a>

```typescript
public readonly capacityProviderStrategies: CapacityProviderStrategy[];
```

- *Type:* aws-cdk-lib.aws_ecs.CapacityProviderStrategy[]
- *Default:* [ { capacityProvider: 'FARGATE_SPOT', base: 2, weight: 50 }, { capacityProvider: 'FARGATE', weight: 50 }, ];

The capacity provider strategies for the service.

---

##### `desiredCount`<sup>Optional</sup> <a name="desiredCount" id="apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.desiredCount"></a>

```typescript
public readonly desiredCount: number;
```

- *Type:* number
- *Default:* When creating the service, default is 1; when updating the service, default uses the current task number.

The desired number of instantiations of the task definition to keep running on the service.

---

##### `discoveryName`<sup>Optional</sup> <a name="discoveryName" id="apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.discoveryName"></a>

```typescript
public readonly discoveryName: string;
```

- *Type:* string
- *Default:* 'default'

The discovery name of the cloud map service.

---

##### `vpcLinkIntegration`<sup>Optional</sup> <a name="vpcLinkIntegration" id="apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.vpcLinkIntegration"></a>

```typescript
public readonly vpcLinkIntegration: VpcLinkIntegration;
```

- *Type:* <a href="#apigateway-patterns.VpcLinkIntegration">VpcLinkIntegration</a>
- *Default:* VpcLinkIntegration.CLOUDMAP;

The vpc link integration type for the API Gateway private integration.

---

##### `vpcSubnets`<sup>Optional</sup> <a name="vpcSubnets" id="apigateway-patterns.ApiGatewayLoadBalancedFargateServiceProps.property.vpcSubnets"></a>

```typescript
public readonly vpcSubnets: SubnetSelection;
```

- *Type:* aws-cdk-lib.aws_ec2.SubnetSelection
- *Default:* Public subnets if `assignPublicIp` is set, otherwise the first available one of Private, Isolated, Public, in that order.

subnets for the ecs tasks.

---

## Classes <a name="Classes" id="Classes"></a>

### CloudMapIntegration <a name="CloudMapIntegration" id="apigateway-patterns.CloudMapIntegration"></a>

#### Initializers <a name="Initializers" id="apigateway-patterns.CloudMapIntegration.Initializer"></a>

```typescript
import { CloudMapIntegration } from 'apigateway-patterns'

new CloudMapIntegration(cloudMapServiceArn: string, vpcLinkId: string, name?: string)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#apigateway-patterns.CloudMapIntegration.Initializer.parameter.cloudMapServiceArn">cloudMapServiceArn</a></code> | <code>string</code> | *No description.* |
| <code><a href="#apigateway-patterns.CloudMapIntegration.Initializer.parameter.vpcLinkId">vpcLinkId</a></code> | <code>string</code> | *No description.* |
| <code><a href="#apigateway-patterns.CloudMapIntegration.Initializer.parameter.name">name</a></code> | <code>string</code> | *No description.* |

---

##### `cloudMapServiceArn`<sup>Required</sup> <a name="cloudMapServiceArn" id="apigateway-patterns.CloudMapIntegration.Initializer.parameter.cloudMapServiceArn"></a>

- *Type:* string

---

##### `vpcLinkId`<sup>Required</sup> <a name="vpcLinkId" id="apigateway-patterns.CloudMapIntegration.Initializer.parameter.vpcLinkId"></a>

- *Type:* string

---

##### `name`<sup>Optional</sup> <a name="name" id="apigateway-patterns.CloudMapIntegration.Initializer.parameter.name"></a>

- *Type:* string

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#apigateway-patterns.CloudMapIntegration.bind">bind</a></code> | Bind this integration to the route. |

---

##### `bind` <a name="bind" id="apigateway-patterns.CloudMapIntegration.bind"></a>

```typescript
public bind(_: HttpRouteIntegrationBindOptions): HttpRouteIntegrationConfig
```

Bind this integration to the route.

###### `_`<sup>Required</sup> <a name="_" id="apigateway-patterns.CloudMapIntegration.bind.parameter._"></a>

- *Type:* @aws-cdk/aws-apigatewayv2-alpha.HttpRouteIntegrationBindOptions

---





## Enums <a name="Enums" id="Enums"></a>

### VpcLinkIntegration <a name="VpcLinkIntegration" id="apigateway-patterns.VpcLinkIntegration"></a>

The vpc link integration type for the API Gateway private integration through the VPC Link.

#### Members <a name="Members" id="Members"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#apigateway-patterns.VpcLinkIntegration.CLOUDMAP">CLOUDMAP</a></code> | *No description.* |
| <code><a href="#apigateway-patterns.VpcLinkIntegration.NLB">NLB</a></code> | *No description.* |
| <code><a href="#apigateway-patterns.VpcLinkIntegration.ALB">ALB</a></code> | *No description.* |

---

##### `CLOUDMAP` <a name="CLOUDMAP" id="apigateway-patterns.VpcLinkIntegration.CLOUDMAP"></a>

---


##### `NLB` <a name="NLB" id="apigateway-patterns.VpcLinkIntegration.NLB"></a>

---


##### `ALB` <a name="ALB" id="apigateway-patterns.VpcLinkIntegration.ALB"></a>

---

