import {
  App, Stack,
  aws_ecs as ecs,
  aws_ec2 as ec2,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiGatewayLoadBalancedFargateService, VpcLinkIntegration } from './agw-balanced-fargate-service';

export class IntegTesting {
  readonly stack: Stack[];
  constructor() {
    const app = new App();
    const env = { region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT };
    const stack = new Stack(app, 'integ-testing', { env });

    const vpc = this.getVpc(stack);
    const cluster = new ecs.Cluster(stack, 'Cluster', {
      vpc,
      enableFargateCapacityProviders: true,
    });

    cluster.addDefaultCapacityProviderStrategy([
      { capacityProvider: 'FARGATE_SPOT', base: 2, weight: 50 },
      { capacityProvider: 'FARGATE', weight: 50 },
    ]);

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
      desiredCount: 2,
      vpcLinkIntegration: VpcLinkIntegration.CLOUDMAP,
    });
    this.stack = [stack];
  }
  private getVpc(scope: Construct): ec2.IVpc {
    return scope.node.tryGetContext('use_default_vpc') === '1' ?
      ec2.Vpc.fromLookup(scope, 'Vpc', { isDefault: true }) :
      scope.node.tryGetContext('use_vpc_id') != undefined ?
        ec2.Vpc.fromLookup(scope, 'Vpc', { vpcId: scope.node.tryGetContext('use_vpc_id') }) :
        new ec2.Vpc(scope, 'Vpc', { natGateways: 1 });
  }
};

new IntegTesting();