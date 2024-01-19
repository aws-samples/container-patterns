import autoscaling = require("aws-cdk-lib/aws-autoscaling");
import ec2 = require("aws-cdk-lib/aws-ec2");
import ecs = require("aws-cdk-lib/aws-ecs");
import cdk = require("aws-cdk-lib");

class ECSCluster extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "MyVpc", { maxAzs: 2 });

    // Autoscaling group that will launch a fleet of instances that have GPU's
    const asg = new autoscaling.AutoScalingGroup(this, "MyFleet", {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.G3,
        ec2.InstanceSize.XLARGE4
      ),
      machineImage: ec2.MachineImage.fromSsmParameter(
        "/aws/service/ecs/optimized-ami/amazon-linux-2/gpu/recommended/image_id"
      ),
      vpc,
      maxCapacity: 10,
    });

    // Attach the fleet to an ECS cluster with a capacity provider.
    // This capacity provider will automatically scale up the ASG
    // to launch more GPU instances when GPU tasks need them.
    const cluster = new ecs.Cluster(this, "EcsCluster", { vpc });
    const capacityProvider = new ecs.AsgCapacityProvider(
      this,
      "AsgCapacityProvider",
      { autoScalingGroup: asg }
    );
    cluster.addAsgCapacityProvider(capacityProvider);

    // Define a task that requires GPU. In this case we just run
    // Make sure to update the image with the last nvidia cuda drivers image for your usage
    // Adapt your nvidia image to your OS as well (for us, Amazon Linux is close to centos7)
    // nvidia-smi to verify that the task is able to reach the GPU
    const gpuTaskDefinition = new ecs.Ec2TaskDefinition(this, "gpu-task");
    gpuTaskDefinition.addContainer("gpu", {
      essential: true,
      image: ecs.ContainerImage.fromRegistry("nvidia/cuda:12.3.1-base-centos7"),
      memoryLimitMiB: 80,
      cpu: 100,
      gpuCount: 1,
      command: ["sh", "-c", "nvidia-smi && sleep 3600"],
      logging: new ecs.AwsLogDriver({
        streamPrefix: "gpu-service",
        logRetention: 1,
      }),
    });

    // Request ECS to launch the task onto the fleet
    new ecs.Ec2Service(this, "gpu-service", {
      cluster,
      desiredCount: 2,
      // Service will automatically request capacity from the
      // capacity provider
      capacityProviderStrategies: [
        {
          capacityProvider: capacityProvider.capacityProviderName,
          base: 0,
          weight: 1,
        },
      ],
      taskDefinition: gpuTaskDefinition,
    });
  }
}

const app = new cdk.App();

new ECSCluster(app, "GpuTask");

app.synth();
