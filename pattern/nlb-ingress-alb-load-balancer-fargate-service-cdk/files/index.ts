import ecs = require('aws-cdk-lib/aws-ecs');
import ec2 = require('aws-cdk-lib/aws-ec2');
import elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import cdk = require('aws-cdk-lib');
import { Stack, StackProps, Size, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

const app = new cdk.App();

class SharedStack extends Stack {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly nlb: elbv2.NetworkLoadBalancer;
  public readonly nlbListener: elbv2.NetworkListener;
  public readonly albListener: elbv2.ApplicationListener;

  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'vpc', {
      maxAzs: 2,
      ipProtocol: ec2.IpProtocol.DUAL_STACK
    });
    this.cluster = new ecs.Cluster(this, 'cluster', { vpc: this.vpc });

    this.nlb = new elbv2.NetworkLoadBalancer(this, 'nlb', {
      vpc: this.vpc,
      internetFacing: true,
      ipAddressType: elbv2.IpAddressType.DUAL_STACK
    })

    // Configure a static EIP for each AZ.
    const cfnNlb = this.nlb.node.defaultChild as elbv2.CfnLoadBalancer;
    cfnNlb.subnetMappings = this.vpc.publicSubnets.map((publicSubnet) => {
      return {
        subnetId: publicSubnet.subnetId,
        allocationId: new ec2.CfnEIP(this, `nlb-eip-${publicSubnet.node.id}`).attrAllocationId
      } as elbv2.CfnLoadBalancer.SubnetMappingProperty;
    })
    cfnNlb.subnets = undefined; // Subnet Mappings remove need for the subnet list

    this.nlbListener = this.nlb.addListener('listener', {
      port: 80
    });

    this.alb = new elbv2.ApplicationLoadBalancer(this, 'alb', {
      vpc: this.vpc,
      internetFacing: false
    });
    this.albListener = this.alb.addListener('listener', {
      port: 80,
      open: true,
    });

    this.albListener.addAction('fixed-action', {
      action: elbv2.ListenerAction.fixedResponse(200, {
        contentType: 'text/plain',
        messageBody: 'OK',
      })
    });

    this.nlbListener.addTargets('alb-target', {
      targets: [new targets.AlbTarget(this.alb, 80)],
      port: 80,
    });

    new cdk.CfnOutput(this, 'dns', { value: this.nlb.loadBalancerDnsName });
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
      desiredCount: 2
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

new LoadBalancerAttachedService(app, 'service', {
  cluster: shared.cluster,
  listener: shared.albListener,
  diskPath: './service',
  webPath: '*',
  priority: 1
})

app.synth();
