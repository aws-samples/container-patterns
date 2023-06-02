import ecs = require('aws-cdk-lib/aws-ecs');
import cdk = require('aws-cdk-lib');
import {
  Container,
  ServiceExtension,
  ContainerMutatingHook
} from '@aws-cdk-containers/ecs-service-extensions';

class HealthCheckPortMutatingHook extends ContainerMutatingHook {
  trafficPort: Number;

  constructor(trafficPort: Number) {
    super();
    this.trafficPort = trafficPort;
  }

  mutateContainerDefinition(props: ecs.ContainerDefinitionOptions): ecs.ContainerDefinitionOptions {
    return {
      ...props,

      // Attach a healthcheck which see's if the traffic port
      // is answering a curl request
      healthCheck: {
        command: [`curl localhost:${this.trafficPort}`],
        interval: cdk.Duration.seconds(5),
        retries: 2,
        startPeriod: cdk.Duration.seconds(20)
      }
    } as ecs.ContainerDefinitionOptions;
  }
}

export class HealthCheckTrafficPort extends ServiceExtension {
  constructor() {
    super('health-check-traffic-port');
  }

  public addHooks() {
    const container = this.parentService.serviceDescription.get('service-container') as Container;

    if (!container) {
      throw new Error('Healthcheck extension requires a `Container` extension');
    }

    container.addContainerMutatingHook(new HealthCheckPortMutatingHook(container.trafficPort));
  }
}
