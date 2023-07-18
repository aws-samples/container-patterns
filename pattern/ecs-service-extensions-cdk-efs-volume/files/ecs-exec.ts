import { ServiceExtension, ServiceBuild } from '@aws-cdk-containers/ecs-service-extensions';

// Enables the ECS Exec feature on an ECS Service
export class Exec extends ServiceExtension {
  constructor() {
    super('ecs-exec');
  }

  public modifyServiceProps(props: ServiceBuild): ServiceBuild {
    return {
      ...props,
      enableExecuteCommand: true
    } as ServiceBuild;
  }
}