import pulumi
import pulumi_aws as aws
import pulumi_awsx as awsx

repository = awsx.ecr.Repository("repository")
image = awsx.ecr.Image("image",
    repository_url=repository.url,
    path="./app")
cluster = aws.ecs.Cluster("cluster")
lb = awsx.lb.ApplicationLoadBalancer("lb")
service = awsx.ecs.FargateService("service",
    cluster=cluster.arn,
    assign_public_ip=True,
    task_definition_args=awsx.ecs.FargateServiceTaskDefinitionArgs(
        container=awsx.ecs.TaskDefinitionContainerDefinitionArgs(
            image=image.image_uri,
            cpu=512,
            memory=128,
            essential=True,
            port_mappings=[awsx.ecs.TaskDefinitionPortMappingArgs(
                target_group=lb.default_target_group,
            )],
        ),
    ))
pulumi.export("url", lb.load_balancer.dns_name)