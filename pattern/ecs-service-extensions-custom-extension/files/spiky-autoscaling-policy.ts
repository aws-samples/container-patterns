
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { ServiceExtension } from '@aws-cdk-containers/ecs-service-extensions';

export class SpikyCpuScalingPolicy extends ServiceExtension {
  constructor() {
    super('spiky-cpu-autoscaling-policy');
  }

  public useService(service: ecs.Ec2Service | ecs.FargateService): void {
    const scalableTarget = service.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10
    })

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
    });
  }
}