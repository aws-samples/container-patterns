package generated_program;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.core.Output;
import com.pulumi.awsx.ecr.Repository;
import com.pulumi.awsx.ecr.Image;
import com.pulumi.awsx.ecr.ImageArgs;
import com.pulumi.aws.ecs.Cluster;
import com.pulumi.awsx.lb.ApplicationLoadBalancer;
import com.pulumi.awsx.ecs.FargateService;
import com.pulumi.awsx.ecs.FargateServiceArgs;
import com.pulumi.awsx.ecs.inputs.FargateServiceTaskDefinitionArgs;
import com.pulumi.awsx.ecs.inputs.TaskDefinitionContainerDefinitionArgs;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    public static void stack(Context ctx) {
        var repository = new Repository("repository");

        var image = new Image("image", ImageArgs.builder()
            .repositoryUrl(repository.url())
            .path("./app")
            .build());

        var cluster = new Cluster("cluster");

        var lb = new ApplicationLoadBalancer("lb");

        var service = new FargateService("service", FargateServiceArgs.builder()
            .cluster(cluster.arn())
            .assignPublicIp(true)
            .taskDefinitionArgs(FargateServiceTaskDefinitionArgs.builder()
                .container(TaskDefinitionContainerDefinitionArgs.builder()
                    .image(image.imageUri())
                    .cpu(512)
                    .memory(128)
                    .essential(true)
                    .portMappings(TaskDefinitionPortMappingArgs.builder()
                        .targetGroup(lb.defaultTargetGroup())
                        .build())
                    .build())
                .build())
            .build());

        ctx.export("url", lb.loadBalancer().applyValue(loadBalancer -> loadBalancer.dnsName()));
    }
}