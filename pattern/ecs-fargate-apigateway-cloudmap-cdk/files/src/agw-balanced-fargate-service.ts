import * as path from 'path';
import * as apigw from '@aws-cdk/aws-apigatewayv2-alpha';
import * as lambdaPython from '@aws-cdk/aws-lambda-python-alpha';

import {
  CustomResource,
  aws_ecs as ecs,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_servicediscovery as sd,
  custom_resources as cr,
  CfnOutput,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * The vpc link integration type for the API Gateway private integration through the VPC Link.
 */
export enum VpcLinkIntegration {
  CLOUDMAP = 'CLOUDMAP',
  NLB = 'NLB',
  ALB = 'ALB',
};

export interface ApiGatewayLoadBalancedFargateServiceProps {
  /**
   * The ECS task definition of the Fargate service.
   */
  readonly taskDefinition: ecs.TaskDefinition;
  /**
   * The VPC for the ECS cluster.
   */
  readonly vpc: ec2.IVpc;
  /**
   * subnets for the ecs tasks
   *
   * @default - Public subnets if `assignPublicIp` is set, otherwise the first available one of Private, Isolated, Public, in that order.
   */
  readonly vpcSubnets?: ec2.SubnetSelection;
  /**
   * The ECS Cluster.
   */
  readonly cluster: ecs.ICluster;
  /**
   * The desired number of instantiations of the task definition to keep running on the service.
   *
   * @default - When creating the service, default is 1; when updating the service,
   * default uses the current task number.
   */
  readonly desiredCount?: number;
  /**
   * The discovery name of the cloud map service
   * @default 'default'
   */
  readonly discoveryName?: string;
  /**
   * The vpc link integration type for the API Gateway private integration
   *
   * @default VpcLinkIntegration.CLOUDMAP;
   */
  readonly vpcLinkIntegration?: VpcLinkIntegration;
  /**
   * The capacity provider strategies for the service.
   *
   * @default - [
      { capacityProvider: 'FARGATE_SPOT', base: 2, weight: 50 },
      { capacityProvider: 'FARGATE', weight: 50 },
    ];
   */
  readonly capacityProviderStrategies?: ecs.CapacityProviderStrategy[];
}

export class CloudMapIntegration extends apigw.HttpRouteIntegration {
  private readonly cloudMapServiceArn: string;
  private readonly vpcLinkId: string;
  constructor(cloudMapServiceArn: string, vpcLinkId: string, name?: string) {
    super(name ?? 'CloudMapIntegration');
    this.cloudMapServiceArn = cloudMapServiceArn;
    this.vpcLinkId = vpcLinkId;
  }
  public bind(_: apigw.HttpRouteIntegrationBindOptions): apigw.HttpRouteIntegrationConfig {
    return {
      type: apigw.HttpIntegrationType.HTTP_PROXY,
      connectionId: this.vpcLinkId,
      connectionType: apigw.HttpConnectionType.VPC_LINK,
      payloadFormatVersion: apigw.PayloadFormatVersion.VERSION_1_0,
      uri: this.cloudMapServiceArn,
      method: apigw.HttpMethod.ANY,
    };
  };
}

export class ApiGatewayLoadBalancedFargateService extends Construct {
  constructor(scope: Construct, id: string, props: ApiGatewayLoadBalancedFargateServiceProps) {
    super(scope, id);

    const defaultCapacityProviderStrategy = [
      { capacityProvider: 'FARGATE_SPOT', base: 2, weight: 50 },
      { capacityProvider: 'FARGATE', weight: 50 },
    ];

    const service = new ecs.FargateService(this, 'FargateService', {
      serviceConnectConfiguration: {
        namespace: props.cluster.defaultCloudMapNamespace ? undefined : this.createCloudMapNamespace(id).namespaceArn,
        services: [{
          portMappingName: props.discoveryName ?? 'default',
        }],
      },
      taskDefinition: props.taskDefinition,
      cluster: props.cluster,
      vpcSubnets: props.vpcSubnets,
      desiredCount: props.desiredCount,
      capacityProviderStrategies: props.capacityProviderStrategies ?? defaultCapacityProviderStrategy,
    });

    // we need look up cloudmapServiceArn with custom resource
    const onEventHandler = new lambdaPython.PythonFunction(this, 'OnEventHandler', {
      handler: 'on_event',
      runtime: lambda.Runtime.PYTHON_3_9,
      entry: path.join(__dirname, '../service-connect-handler'),
      index: 'index.py',
    });

    const provider = new cr.Provider(this, 'serviceConnectHandler', {
      onEventHandler,
    });

    onEventHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ecs:DescribeServices'],
      resources: [service.serviceArn],
    }));

    const serviceConnectHandler = new CustomResource(this, 'service-connect-handler', {
      serviceToken: provider.serviceToken,
      resourceType: 'Custom::ServiceConnectHandler',
      properties: {
        clusterName: props.cluster.clusterName,
        serviceName: service.serviceName,
        discoveryName: props.discoveryName ?? 'default',
      },
    });

    const cloudmapServiceArn = serviceConnectHandler.getAttString('serviceArn');

    const vpcLink = new apigw.VpcLink(this, 'VpcLink', {
      vpc: props.vpc,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    service.connections.allowFrom(ec2.Peer.ipv4(props.vpc.vpcCidrBlock), ec2.Port.tcp(80));

    const api = new apigw.HttpApi(this, 'HttpApi', {
      defaultIntegration: new CloudMapIntegration(cloudmapServiceArn, vpcLink.vpcLinkId),
    });

    new CfnOutput(this, 'ApiEndpoint', { value: api.apiEndpoint });
  }
  private createCloudMapNamespace(id: string): sd.INamespace {
    return new sd.HttpNamespace(this, `httpNameSpace${id}`, {
      name: `httpNameSpace${id}`,
    });
  }
}