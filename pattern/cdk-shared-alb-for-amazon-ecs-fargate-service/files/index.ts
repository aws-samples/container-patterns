import ecs = require('aws-cdk-lib/aws-ecs');
import ec2 = require('aws-cdk-lib/aws-ec2');
import elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
import cdk = require('aws-cdk-lib');
import { Stack, StackProps, Size, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

const app = new cdk.App();

class SharedStack extends Stack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;
  public readonly lb: elbv2.ApplicationLoadBalancer;
  public readonly listener: elbv2.ApplicationListener;

  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'vpc', { maxAzs: 2 });
    this.cluster = new ecs.Cluster(this, 'cluster', { vpc: this.vpc });
    this.lb = new elbv2.ApplicationLoadBalancer(this, 'lb', {
      vpc: this.vpc,
      internetFacing: true
    });
    this.listener = this.lb.addListener('listener', {
      port: 80,
      open: true,
    });

    this.listener.addAction('fixed-action', {
      action: elbv2.ListenerAction.fixedResponse(200, {
        contentType: 'text/plain',
        messageBody: 'OK',
      })
    });

    new cdk.CfnOutput(this, 'dns', { value: this.lb.loadBalancerDnsName });
  }
}

interface ServiceProps extends StackProps {
  cluster: ecs.Cluster;
  listener: elbv2.ApplicationListener;
  diskPath: string;
  webPath: string;
  priority: number;
}

class LoadBalancerAttachedService extends Stack {
  public readonly taskDefinition: ecs.TaskDefinition;
  public readonly container: ecs.ContainerDefinition;
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ServiceProps) {
    super(scope, id, props);

    this.taskDefinition = new ecs.FargateTaskDefinition(this, `${id}-task-def`);
    this.container = this.taskDefinition.addContainer('web', {
      image: ecs.ContainerImage.fromAsset(props.diskPath),
      memoryLimitMiB: 256,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: `${id}`,
        mode: ecs.AwsLogDriverMode.NON_BLOCKING,
        maxBufferSize: Size.mebibytes(25),
      }),
    });

    this.container.addPortMappings({
      containerPort: 8080,
      protocol: ecs.Protocol.TCP
    });

    this.service = new ecs.FargateService(this, `${id}-service`, {
      cluster: props.cluster,
      taskDefinition: this.taskDefinition,
    });

    // Attach ALB to ECS Service
    props.listener.addTargets(`${id}-target`, {
      priority: props.priority,
      conditions: [
        elbv2.ListenerCondition.pathPatterns([props.webPath]),
      ],
      port: 80,
      targets: [this.service.loadBalancerTarget({
        containerName: 'web',
        containerPort: 8080
      })],
      healthCheck: {
        interval: cdk.Duration.seconds(10),
        path: "/",
        timeout: cdk.Duration.seconds(5),
      },
      deregistrationDelay: Duration.seconds(10)
    });
  }
}

const shared = new SharedStack(app, 'shared-resources');

new LoadBalancerAttachedService(app, 'service-one', {
  cluster: shared.cluster,
  listener: shared.listener,
  diskPath: './service-one',
  webPath: '/service-one*',
  priority: 1
})

new LoadBalancerAttachedService(app, 'service-two', {
  cluster: shared.cluster,
  listener: shared.listener,
  diskPath: './service-two',
  webPath: '/service-two*',
  priority: 2
})

app.synth();
