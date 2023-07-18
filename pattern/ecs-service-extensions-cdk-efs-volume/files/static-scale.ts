import { ServiceExtension, ServiceBuild } from '@aws-cdk-containers/ecs-service-extensions';

export interface ScalingProperties {
  desiredCount: number
}

// Scales out a service to a static desired count
export class StaticScaleOut extends ServiceExtension {
  private desiredCount: number;

  constructor(props: ScalingProperties) {
    super('static-scale');

    this.desiredCount = props.desiredCount;
  }

  public modifyServiceProps(props: ServiceBuild): ServiceBuild {
    return {
      ...props,

      desiredCount: this.desiredCount
    } as ServiceBuild;
  }
}