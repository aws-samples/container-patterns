
import cdk = require('aws-cdk-lib');
import { Construct } from 'constructs';
import { ServiceExtension, Service, ServiceBuild } from '@aws-cdk-containers/ecs-service-extensions';

export class LongStartupGracePeriod extends ServiceExtension {
  constructor() {
    super('long-grace-period');
  }

  public prehook(service: Service, scope: Construct) {
    this.parentService = service;
    this.scope = scope;
  }

  // Modify the service to have an two minute grace period on startup
  public modifyServiceProps(props: ServiceBuild): ServiceBuild {
    return {
      ...props,

      healthCheckGracePeriod: cdk.Duration.minutes(2)
    } as ServiceBuild;
  }
}