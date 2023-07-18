import ecs = require('aws-cdk-lib/aws-ecs');
import iam = require('aws-cdk-lib/aws-iam');
import efs = require('aws-cdk-lib/aws-efs');
import { Service, ServiceExtension } from '@aws-cdk-containers/ecs-service-extensions';
import { Construct } from 'constructs';

export interface VolumeProperties {
  path: string,
  readonly: boolean
}

// Attach a durable volume to a task, with the IAM permissions and
// security group rules that allow the filesystem to be used
export class DurableVolume extends ServiceExtension {
  private filesystem: efs.FileSystem;
  private path: string;
  private readonly: boolean;

  constructor(props: VolumeProperties) {
    super('durable-volume');

    this.path = props.path;
    this.readonly = props.readonly;
  }

  public prehook(parentService: Service, scope: Construct) {
    this.filesystem = new efs.FileSystem(scope, `${parentService.id}-file-system`, {
      vpc: parentService.vpc,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS, // files are not transitioned to infrequent access (IA) storage by default
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE, // default
      outOfInfrequentAccessPolicy: efs.OutOfInfrequentAccessPolicy.AFTER_1_ACCESS, // files are not transitioned back from (infrequent access) IA to primary storage by default
    });
  }

  public useTaskDefinition(taskDefinition: ecs.TaskDefinition): void {
    taskDefinition.addVolume({
      name: 'durable-volume',
      efsVolumeConfiguration: {
        fileSystemId: this.filesystem.fileSystemId,
        rootDirectory: '/',
        transitEncryption: 'ENABLED'
      }
    })

    // Add a policy to the task definition allowing it to point the Elastic File System
    const efsMountPolicy = (new iam.PolicyStatement({
      actions: [
        'elasticfilesystem:ClientMount',
        'elasticfilesystem:ClientWrite',
        'elasticfilesystem:ClientRootAccess'
      ],
      resources: [
        this.filesystem.fileSystemArn
      ]
    }))
    taskDefinition.addToTaskRolePolicy(efsMountPolicy)

    const appContainer = taskDefinition.findContainer('app');

    if (!appContainer) {
      throw new Error('Can not add a volume to a task before adding the application container');
    }

    appContainer.addMountPoints({
      containerPath: this.path,
      readOnly: this.readonly,
      sourceVolume: 'durable-volume'
    })
  }

  public useService(service: ecs.Ec2Service | ecs.FargateService): void {
    // Ensure that the service has access to communicate to the filesystem.
    this.filesystem.connections.allowDefaultPortFrom(service);
  }
}