import ecs = require('aws-cdk-lib/aws-ecs');
import { ServiceExtension } from '@aws-cdk-containers/ecs-service-extensions';

export enum Size {
  SMALL,
  MEDIUM,
  LARGE
}

// Adjust task size to one of three standardized sizes.
export class TaskSize extends ServiceExtension {
  requestedSize: Size;

  constructor(requestedSize: Size) {
    super('task-size');
    this.requestedSize = requestedSize;
  }

  modifyTaskDefinitionProps(props: ecs.TaskDefinitionProps): ecs.TaskDefinitionProps {
    let requestedCpu = 256, requestedMemory = 512;

    if (this.requestedSize == Size.SMALL) {
      requestedCpu = 256;
      requestedMemory = 512;
    } else if (this.requestedSize == Size.MEDIUM) {
      requestedCpu = 1024;
      requestedMemory = 2048;
    } else if (this.requestedSize == Size.LARGE) {
      requestedCpu = 2048;
      requestedMemory = 4096;
    }

    return {
      ...props,
      cpu: requestedCpu.toString(),
      memoryMiB: requestedMemory.toString()
    } as ecs.TaskDefinitionProps;
  }
}
