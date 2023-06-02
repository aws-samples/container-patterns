import ecs = require('aws-cdk-lib/aws-ecs');
import cdk = require('aws-cdk-lib');
import {
  Container,
  Environment,
  Service,
  ServiceDescription
} from '@aws-cdk-containers/ecs-service-extensions';
import { HealthCheckTrafficPort } from './healthcheck-traffic-port';
import { Size, TaskSize } from './task-size';
import { CloudWatchAgentSidecar } from './cloudwatch-agent';
import { LongStartupGracePeriod } from './long-startup-grace-period';
import { SpikyCpuScalingPolicy } from './spiky-autoscaling-policy';

class ECSStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an environment to deploy a service in.
    const environment = new Environment(this, 'test-environment');

    // Build out the service description
    const description = new ServiceDescription();

    // Define the container for the service.
    description.add(new Container({
      cpu: 1024,
      memoryMiB: 2048,
      trafficPort: 80,
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/nginx/nginx'),
      environment: {
        PORT: '80',
      },
    }));

    description.add(new SpikyCpuScalingPolicy())
    description.add(new CloudWatchAgentSidecar())
    description.add(new TaskSize(Size.LARGE))
    description.add(new HealthCheckTrafficPort())
    description.add(new LongStartupGracePeriod())

    // Use the service description to make a service
    // inside of the environment.
    new Service(this, 'test-service', {
      environment: environment,
      serviceDescription: description,
    });
  }
}

const app = new cdk.App();
new ECSStack(app, 'custom-ecs-service-extension');
app.synth();