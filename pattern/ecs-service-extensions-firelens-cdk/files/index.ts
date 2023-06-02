import ecs = require('aws-cdk-lib/aws-ecs');
import cdk = require('aws-cdk-lib');
import {
  Container,
  Environment,
  HttpLoadBalancerExtension,
  FireLensExtension,
  Service,
  ServiceDescription
} from '@aws-cdk-containers/ecs-service-extensions';

class ECSStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an environment to deploy a service in.
    const environment = new Environment(this, 'production');

    // Build out the service description
    const nameDescription = new ServiceDescription();

    // Define the container for the service.
    nameDescription.add(new Container({
      cpu: 1024,
      memoryMiB: 2048,
      trafficPort: 80,
      image: ecs.ContainerImage.fromRegistry('nathanpeck/name'),
      environment: {
        PORT: '80',
      },
    }));

    // Create a load balancer and attach it to the
    // container's traffic port.
    nameDescription.add(new HttpLoadBalancerExtension());

    // Route logs with FireLens
    nameDescription.add(new FireLensExtension());

    // Use the service description to make a service
    // inside of the environment.
    new Service(this, 'name', {
      environment: environment,
      serviceDescription: nameDescription,
    });
  }
}

const app = new cdk.App();
new ECSStack(app, 'ECSStack');
app.synth();