---
title: Container image signing and verification using AWS Signer for Amazon ECS and AWS Fargate
description: >-
  How to use AWS Signer to verify container images run using Amazon ECS and AWS Fargate
filterDimensions:
  - key: tool
    value: cloudformation
  - key: capacity
    value: fargate
  - key: type
    value: tutorial
authors:
  - peckn
date: Dec 5, 2023
---

#### About

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) is a fully managed container orchestration service that helps you to more efficiently deploy, manage, and scale containerized applications. Elastic Container Service works best with [AWS Fargate](https://aws.amazon.com/fargate/), a serverless, pay-as-you-go compute engine that lets you focus on building applications without managing servers.

[AWS Signer](https://docs.aws.amazon.com/signer/latest/developerguide/Welcome.html) is a fully managed code-signing service to ensure the trust and integrity of your code. It can be used to sign and verify container images.

[The Notary Project](https://notaryproject.dev/) is a set of specifications and tools that provide a cross-industry standard for securing software supply chains by signing and verifying container images and other OCI artifacts.  AWS Signer provides a plugin for Notation, a new client from the Notary Project, that customers can use to simplify their signing and verification workflows.

In this reference architecture you will sign a container image, then deploy an automated event hook for [Amazon Elastic Container Service](https://aws.amazon.com/ecs/). The hook will use Notation to check if containers launched on [AWS Fargate](https://aws.amazon.com/fargate/) are actually signed and verified. This architecture will also work for Amazon ECS on EC2.

#### Architecture

The following diagram shows the architecture you will deploy:

!!! @/pattern/ecs-fargate-container-image-signing-and-verification/diagram.svg

::: warning
This EventBridge powered hook is read-only, and asynchronous from the ECS task launch workflow.
Therefore this hook based architecture is only intended for auditing and notifying of unsigned or unapproved images
being launched, such as for an auditing use case. The hook can only observe task launches and verify container images
that are already in the process of being started up. It can not actually block Elastic Container Service
from launching an unsigned or unapproved image.
:::

1. A task launch is initiated (either by the ECS `RunTask` API call, or the ECS `CreateService` API call)
2. The task launch generates a task state change event that is picked up by Amazon EventBridge
3. If the task state change is a task launch then EventBridge invokes a Lambda function to verify image signatures
4. The Lambda function downloads the container image manifest and verifies the signature, using AWS Signer to
   verify the signature's integrity, expiry, provenance , and revocation status.
5. You can plug your own logic into the Lambda for handling unsigned images: log and ignore, stop the task, send a Slack message or Pagerduty alert, etc.

#### Dependencies

In order to setup this architecture you need:

* Latest AWS CLI, and an AWS account
* [Notation CLI with AWS Signer plugin](https://docs.aws.amazon.com/signer/latest/developerguide/image-signing-prerequisites.html) - This is used to sign and verify container images.
* [Amazon ECR Credential Helper](https://github.com/awslabs/amazon-ecr-credential-helper) - This will automatically use your current IAM credentials to give you access to Elastic Container Registry.

You can verify that Notation CLI is installed:

```sh
notation version
```

You should see the following output:

```txt
Notation - a tool to sign and verify artifacts.

Version:     1.0.0
Go version:  go1.20.7
Git commit:  80e3fc4e2eeb43ac00bc888cf41101f5c56f1535
```

Next verify that AWS Signer is installed as a plugin:

```sh
notation plugin ls
```

You should see the following output:

```txt
NAME                                   DESCRIPTION                      VERSION   CAPABILITIES                                                                                             ERROR
com.amazonaws.signer.notation.plugin   AWS Signer plugin for Notation   1.0.298   [SIGNATURE_GENERATOR.ENVELOPE SIGNATURE_VERIFIER.TRUSTED_IDENTITY SIGNATURE_VERIFIER.REVOCATION_CHECK]   <nil>
```

#### Create the registry

First of all we need a signed container image for testing. In order to accomplish this you will pull a public image from Elastic Container Registry public gallery, sign it, and then push it to your own private registry.

First let's create the supporting infrastructure for storing containers:

<<< files/registry.yml

Use the following `parent-step-01.yml` file to deploy the `registry.yml` file. This will allow us to add additional stacks as modules later:

<<< files/parent-step-01.yml

You can deploy the parent stack using the following command:

```sh
sam deploy \
  --template-file parent-step-01.yml \
  --stack-name aws-signer-image-verification \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM
```

#### Sign and push a container image to the registry

First copy the public image into your own private registry.

```sh
REPO_URI=$(aws cloudformation describe-stacks --stack-name aws-signer-image-verification --query "Stacks[0].Outputs[?OutputKey=='SignedRepositoryUri'].OutputValue" --output text)

docker pull public.ecr.aws/ecs-sample-image/amazon-ecs-sample:latest
docker tag public.ecr.aws/ecs-sample-image/amazon-ecs-sample:latest $REPO_URI:demo-app
docker push $REPO_URI:demo-app

APP_IMAGE_SHA=$(docker inspect --format='{{index .RepoDigests 0}}' $REPO_URI:demo-app)
```

Use Notation to sign the image:

```sh
SIGNING_PROFILE_ARN=$(aws cloudformation describe-stacks --stack-name aws-signer-image-verification --query "Stacks[0].Outputs[?OutputKey=='SigningProfileArn'].OutputValue" --output text)

notation sign $APP_IMAGE_SHA  \
--plugin com.amazonaws.signer.notation.plugin \
--id $SIGNING_PROFILE_ARN
```

Now you can inspect the image to see the trust chain:

```sh
notation inspect $APP_IMAGE_SHA
```

You will see output similar to this, showing a chain of AWS Signer signatures verifying the image:

```txt
Inspecting all signatures for signed artifact
209640446841.dkr.ecr.us-east-2.amazonaws.com/aws-signer-image-verification-registrystack-1wx1liv7jgtji-privatecontainerregistry-jy91ycwfb07n@sha256:3c4c1f42a89e343c7b050c5e5d6f670a0e0b82e70e0e7d023f10092a04bbb5a7
└── application/vnd.cncf.notary.signature
    ├── sha256:7ca0bafbbf0fce4a90d9f2fd6765910392cef72bf8e62a60043a01632a9d781c
    │   ├── media type: application/jose+json
    │   ├── signature algorithm: ECDSA-SHA-384
    │   ├── signed attributes
    │   │   ├── signingTime: Wed Dec  6 01:20:03 2023
    │   │   ├── expiry: Sun Dec  6 01:20:03 2026
    │   │   ├── io.cncf.notary.verificationPlugin: com.amazonaws.signer.notation.plugin
    │   │   ├── com.amazonaws.signer.signingProfileVersion: arn:aws:signer:us-east-2:209640446841:/signing-profiles/SigningProfile_0Aoxfd1fB9Lu/awUPb84ibN
    │   │   ├── com.amazonaws.signer.signingJob: arn:aws:signer:us-east-2:209640446841:/signing-jobs/e218ee67-5dd3-4dc4-8caf-224898b12493
    │   │   └── signingScheme: notary.x509.signingAuthority
    │   ├── user defined attributes
    │   │   └── (empty)
    │   ├── unsigned attributes
    │   │   └── (empty)
    │   ├── certificates
    │   │   ├── SHA256 fingerprint: dab5bb7bbd23b298fefe3de475e02ef049e36726db4aba6ca62ec4cdb174132d
    │   │   │   ├── issued to: CN=AWS Signer,OU=AWS Cryptography,O=AWS,L=Seattle,ST=WA,C=US
    │   │   │   ├── issued by: CN=AWS Signer us-east-2 Code Signing CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │   │   └── expiry: Sat Dec  9 00:30:50 2023
    │   │   ├── SHA256 fingerprint: d49c2c63e66818a6e8228701a5b13db31022f8777ede82395b365aa462fc12f1
    │   │   │   ├── issued to: CN=AWS Signer us-east-2 Code Signing CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │   │   ├── issued by: CN=AWS Signer Code Signing Int CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │   │   └── expiry: Tue Oct  1 22:10:13 2024
    │   │   ├── SHA256 fingerprint: eaaac975dcc0d5d160fca1e39834834f014a238cd224d053670982388ccbfca1
    │   │   │   ├── issued to: CN=AWS Signer Code Signing Int CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │   │   ├── issued by: CN=AWS Signer Code Signing Root CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │   │   └── expiry: Thu Oct 28 23:18:32 2027
    │   │   └── SHA256 fingerprint: 90a87d0543c3f094dbff9589b6649affe2f3d6e0f308799be2258461c686473f
    │   │       ├── issued to: CN=AWS Signer Code Signing Root CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │       ├── issued by: CN=AWS Signer Code Signing Root CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │       └── expiry: Tue Oct 27 22:33:22 2122
    │   └── signed artifact
    │       ├── media type: application/vnd.docker.distribution.manifest.v2+json
    │       ├── digest: sha256:3c4c1f42a89e343c7b050c5e5d6f670a0e0b82e70e0e7d023f10092a04bbb5a7
    │       └── size: 1778
    └── sha256:5c8ec6f038b5574a80c89b0a297d7f67b4c58c63e95b4adf0975a85f5de72aaa
        ├── media type: application/jose+json
        ├── signature algorithm: ECDSA-SHA-384
        ├── signed attributes
        │   ├── com.amazonaws.signer.signingJob: arn:aws:signer:us-east-2:209640446841:/signing-jobs/38627deb-eb04-4383-a247-3f6521178f37
        │   ├── signingScheme: notary.x509.signingAuthority
        │   ├── signingTime: Wed Dec  6 01:23:40 2023
        │   ├── expiry: Sun Dec  6 01:23:40 2026
        │   ├── io.cncf.notary.verificationPlugin: com.amazonaws.signer.notation.plugin
        │   └── com.amazonaws.signer.signingProfileVersion: arn:aws:signer:us-east-2:209640446841:/signing-profiles/SigningProfile_0Aoxfd1fB9Lu/awUPb84ibN
        ├── user defined attributes
        │   └── (empty)
        ├── unsigned attributes
        │   └── (empty)
        ├── certificates
        │   ├── SHA256 fingerprint: dab5bb7bbd23b298fefe3de475e02ef049e36726db4aba6ca62ec4cdb174132d
        │   │   ├── issued to: CN=AWS Signer,OU=AWS Cryptography,O=AWS,L=Seattle,ST=WA,C=US
        │   │   ├── issued by: CN=AWS Signer us-east-2 Code Signing CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │   │   └── expiry: Sat Dec  9 00:30:50 2023
        │   ├── SHA256 fingerprint: d49c2c63e66818a6e8228701a5b13db31022f8777ede82395b365aa462fc12f1
        │   │   ├── issued to: CN=AWS Signer us-east-2 Code Signing CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │   │   ├── issued by: CN=AWS Signer Code Signing Int CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │   │   └── expiry: Tue Oct  1 22:10:13 2024
        │   ├── SHA256 fingerprint: eaaac975dcc0d5d160fca1e39834834f014a238cd224d053670982388ccbfca1
        │   │   ├── issued to: CN=AWS Signer Code Signing Int CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │   │   ├── issued by: CN=AWS Signer Code Signing Root CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │   │   └── expiry: Thu Oct 28 23:18:32 2027
        │   └── SHA256 fingerprint: 90a87d0543c3f094dbff9589b6649affe2f3d6e0f308799be2258461c686473f
        │       ├── issued to: CN=AWS Signer Code Signing Root CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │       ├── issued by: CN=AWS Signer Code Signing Root CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │       └── expiry: Tue Oct 27 22:33:22 2122
        └── signed artifact
            ├── media type: application/vnd.docker.distribution.manifest.v2+json
            ├── digest: sha256:3c4c1f42a89e343c7b050c5e5d6f670a0e0b82e70e0e7d023f10092a04bbb5a7
            └── size: 1778
```

#### Build the image verifier

Now let's setup the runtime component of this architecture. We will build a Lambda function that
runs `notation` for us.

Create a folder `sigverify` and put the following two files inside of it:

<tabs>
<tab label="Dockerfile">

<<< files/sigverify/Dockerfile{Dockerfile}

</tab>
<tab label="sigverify.py">

<<< files/sigverify/sigverify.py

</tab>
</tabs>

::: warning
If you look at the code inside of `sigverify.py` you will notice the Lambda function does not take any action
in response to a container failing validation. If the Notation verification fails it will just print an output to
the Lambda function logs. It is also unable to block ECS from actually stopping the task, as this hook is
asynchronous from the actual ECS workflow.
:::

You should now have a folder `sigverify` and two files inside of it:

- `Dockerfile` - Defines how to build the Lambda function with `notation` built-in. This includes generating a trust policy
                 that will be referred to when deciding whether or not to trust images. The built-in trust policy enforces that all
                 images must be signed by the AWS Signer signing profile created in the first step.
- `sigverify.py` - The actual code file that contains the Lambda function code that runs. It runs Notation against each image in the
                 task definition.

Build and push the function's container image using the following command:

```sh
LAMBDA_REPO=$(aws cloudformation describe-stacks --stack-name aws-signer-image-verification --query "Stacks[0].Outputs[?OutputKey=='LambdaRepositoryUri'].OutputValue" --output text)

docker build -t $LAMBDA_REPO --build-arg signing_profile_arn=$SIGNING_PROFILE_ARN ./sigverify
docker push $LAMBDA_REPO
LAMBDA_IMAGE_SHA=$(docker inspect --format='{{index .RepoDigests 0}}' $LAMBDA_REPO)
```

::: info
The container image build requires a modern version of Docker with BuildKit. If you are using an older version of Docker you may get an error
about an unterminated heredoc. This is because the `Dockerfile` uses an embedded heredoc to define the trust policy file. You
could also choose to generate this file outside on your host machine and then `ADD` it to the image if you are unable to update
to a modern version of Docker.
:::

#### Deploy the image verifier

First we need to define the verification Lambda function to run:

<<< files/sigverify.yml

Next we add the verification function to the application:

<<< files/parent-step-02.yml

We can deploy this application using the following command:

```sh
sam deploy \
  --template-file parent-step-02.yml \
  --stack-name aws-signer-image-verification \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides LambdaImageUri=$LAMBDA_IMAGE_SHA
```

#### Deploy sample ECS task with the signed image

It is time to deploy a sample workload and check to make sure the Lambda function is working.

First we can define a signed task definition to run.

<<< files/sample-task.yml

And add the sample task stack to the application definition:

<<< files/parent-step-03.yml

Now you can deploy the application stack with the following command:

```sh
sam deploy \
  --template-file parent-step-03.yml \
  --stack-name aws-signer-image-verification \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides LambdaImageUri=$LAMBDA_IMAGE_SHA SignedImageUri=$APP_IMAGE_SHA
```

::: tip
Notice that we passed in the full image reference with a SHA rather than just using a tag
reference. This ensure that the task definition stays immutable, and it gives Notation the
information it needs to verify the right version of the container, which is the same version that
is running in AWS Fargate.
:::

#### Verify it works

In order to launch the sample task, let's just use the Amazon ECS console for simplicity.

1. Open up the Amazon ECS console and either create a new cluster, or use an existing cluster.
2. Click to view the cluster details, and select the task list.
3. Click the "Run new task" button.
4. Under compute options select "Launch Type"
5. Under deployment configuration select the family `signed-task-def`
6. Click "Create" and observe a new task launching in the cluster

Now you can visit the Lambda function logs to see whether these tasks passed or failed verification.
You will see log output similar to one of the following examples:

<tabs>
<tab label="Trusted Signature">

This is the output when the function successfully verifies an image's signature:

```txt
2023-12-15T15:15:53.093-05:00	START RequestId: 184e6833-99ae-46b3-95ac-84df625fc1e6 Version: $LATEST
2023-12-15T15:15:53.285-05:00	level=info msg="Using the referrers tag schema"
2023-12-15T15:15:53.394-05:00	level=info msg="Reference sha256:7ebff78b7d7bd0cb13d462ecf4d9aaa6ea7571bd5548008163d0499eae2fbf40 resolved to manifest descriptor: {MediaType:application/vnd.docker.distribution.manifest.v2+json Digest:sha256:7ebff78b7d7bd0cb13d462ecf4d9aaa6ea7571bd5548008163d0499eae2fbf40 Size:1778 URLs:[] Annotations:map[] Data:[] Platform:<nil> ArtifactType:}"
2023-12-15T15:15:53.394-05:00	level=info msg="Checking whether signature verification should be skipped or not"
2023-12-15T15:15:53.394-05:00	level=info msg="Trust policy configuration: &{Name:aws-signer-tp RegistryScopes:[*] SignatureVerification:{VerificationLevel:strict Override:map[]} TrustStores:[signingAuthority:aws-signer-ts] TrustedIdentities:[arn:aws:signer:us-east-2:209640446841:/signing-profiles/SigningProfile_0y9b0jhBJAoh]}"
2023-12-15T15:15:53.394-05:00	level=info msg="Check over. Trust policy is not configured to skip signature verification"
2023-12-15T15:15:53.540-05:00	level=info msg="Processing signature with manifest mediaType: application/vnd.oci.image.manifest.v1+json and digest: sha256:6228069a242657828cd524c21a554bb7e1f877fad63ff9c9848f3822a470a028"
2023-12-15T15:15:53.701-05:00	level=info msg="Trust policy configuration: &{Name:aws-signer-tp RegistryScopes:[*] SignatureVerification:{VerificationLevel:strict Override:map[]} TrustStores:[signingAuthority:aws-signer-ts] TrustedIdentities:[arn:aws:signer:us-east-2:209640446841:/signing-profiles/SigningProfile_0y9b0jhBJAoh]}"
2023-12-15T15:15:53.873-05:00	Successfully verified signature for 209640446841.dkr.ecr.us-east-2.amazonaws.com/aws-signer-image-verification-registrystack-15g6wn192kvr1-signedcontainerregistry-ryrpet5bhnbg@sha256:7ebff78b7d7bd0cb13d462ecf4d9aaa6ea7571bd5548008163d0499eae2fbf40
2023-12-15T15:15:53.877-05:00	END RequestId: 184e6833-99ae-46b3-95ac-84df625fc1e6
2023-12-15T15:15:53.877-05:00	REPORT RequestId: 184e6833-99ae-46b3-95ac-84df625fc1e6 Duration: 783.63 ms Billed Duration: 1186 ms Memory Size: 1024 MB Max Memory Used: 100 MB Init Duration: 401.84 ms
```

</tab>
<tab label="No Signature">

This is the output for an unsigned image, when the trust policy expects images to be signed:

```txt
2023-12-13T11:16:01.290-05:00	START RequestId: 1883a890-84f1-4ac9-8b4c-ca63c395e0e2 Version: $LATEST
2023-12-13T11:16:01.319-05:00	level=info msg="Using the referrers tag schema"
2023-12-13T11:16:01.495-05:00	level=info msg="Reference sha256:22f34fb040d17d2cca44ba5903c6af24b3cf6ed97bc1aeb257c510b1b829701d resolved to manifest descriptor: {MediaType:application/vnd.docker.distribution.manifest.v2+json Digest:sha256:22f34fb040d17d2cca44ba5903c6af24b3cf6ed97bc1aeb257c510b1b829701d Size:2406 URLs:[] Annotations:map[] Data:[] Platform:<nil> ArtifactType:}"
2023-12-13T11:16:01.495-05:00	level=info msg="Checking whether signature verification should be skipped or not"
2023-12-13T11:16:01.495-05:00	level=info msg="Trust policy configuration: &{Name:aws-signer-tp RegistryScopes:[*] SignatureVerification:{VerificationLevel:strict Override:map[]} TrustStores:[signingAuthority:aws-signer-ts] TrustedIdentities:[arn:aws:signer:us-east-2:209640446841:/signing-profiles/SigningProfile_0y9b0jhBJAoh]}"
2023-12-13T11:16:01.495-05:00	level=info msg="Check over. Trust policy is not configured to skip signature verification"
2023-12-13T11:16:01.673-05:00	Error: signature verification failed: no signature is associated with "209640446841.dkr.ecr.us-east-2.amazonaws.com/bun-hitcounter@sha256:22f34fb040d17d2cca44ba5903c6af24b3cf6ed97bc1aeb257c510b1b829701d", make sure the artifact was signed successfully
2023-12-13T11:16:01.674-05:00	209640446841.dkr.ecr.us-east-2.amazonaws.com/bun-hitcounter@sha256:22f34fb040d17d2cca44ba5903c6af24b3cf6ed97bc1aeb257c510b1b829701d failed signature verification.
2023-12-13T11:16:01.676-05:00	END RequestId: 1883a890-84f1-4ac9-8b4c-ca63c395e0e2
2023-12-13T11:16:01.676-05:00	REPORT RequestId: 1883a890-84f1-4ac9-8b4c-ca63c395e0e2 Duration: 385.34 ms Billed Duration: 386 ms Memory Size: 1024 MB Max Memory Used: 89 MB
```


</tab>
<tab label="Untrusted Signature">

This is the output when the image has a signature, but it is not a trusted signature according to the trust policy:

```txt
2023-12-15T15:19:08.623-05:00	START RequestId: 9974d1b8-b59e-4793-9eea-eceabd288cce Version: $LATEST
2023-12-15T15:19:08.656-05:00	level=info msg="Using the referrers tag schema"
2023-12-15T15:19:08.751-05:00	level=info msg="Reference sha256:7ebff78b7d7bd0cb13d462ecf4d9aaa6ea7571bd5548008163d0499eae2fbf40 resolved to manifest descriptor: {MediaType:application/vnd.docker.distribution.manifest.v2+json Digest:sha256:7ebff78b7d7bd0cb13d462ecf4d9aaa6ea7571bd5548008163d0499eae2fbf40 Size:1778 URLs:[] Annotations:map[] Data:[] Platform:<nil> ArtifactType:}"
2023-12-15T15:19:08.751-05:00	level=info msg="Checking whether signature verification should be skipped or not"
2023-12-15T15:19:08.751-05:00	level=info msg="Trust policy configuration: &{Name:aws-signer-tp RegistryScopes:[*] SignatureVerification:{VerificationLevel:strict Override:map[]} TrustStores:[signingAuthority:aws-signer-ts] TrustedIdentities:[arn:aws:signer:us-east-2:209640446841:/signing-profiles/SigningProfile_0y9b0jhBJAoh]}"
2023-12-15T15:19:08.751-05:00	level=info msg="Check over. Trust policy is not configured to skip signature verification"
2023-12-15T15:19:08.894-05:00	level=info msg="Processing signature with manifest mediaType: application/vnd.oci.image.manifest.v1+json and digest: sha256:fc4ee5d8335a385ba0a5a6dabc58ca1e55275182328b3ce3eab17fbce86529ab"
2023-12-15T15:19:09.069-05:00	level=info msg="Trust policy configuration: &{Name:aws-signer-tp RegistryScopes:[*] SignatureVerification:{VerificationLevel:strict Override:map[]} TrustStores:[signingAuthority:aws-signer-ts] TrustedIdentities:[arn:aws:signer:us-east-2:209640446841:/signing-profiles/SigningProfile_0y9b0jhBJAoh]}"
2023-12-15T15:19:09.243-05:00	level=warning msg="Signature sha256:fc4ee5d8335a385ba0a5a6dabc58ca1e55275182328b3ce3eab17fbce86529ab failed verification with error: trusted identify verification by plugin \"com.amazonaws.signer.notation.plugin\" failed with reason \"signature publisher doesn't match any trusted identities\""
2023-12-15T15:19:09.243-05:00	Error: signature verification failed for all the signatures associated with 209640446841.dkr.ecr.us-east-2.amazonaws.com/aws-signer-image-verification-registrystack-15g6wn192kvr1-signedcontainerregistry-ryrpet5bhnbg@sha256:7ebff78b7d7bd0cb13d462ecf4d9aaa6ea7571bd5548008163d0499eae2fbf40
2023-12-15T15:19:09.244-05:00	209640446841.dkr.ecr.us-east-2.amazonaws.com/aws-signer-image-verification-registrystack-15g6wn192kvr1-signedcontainerregistry-ryrpet5bhnbg@sha256:7ebff78b7d7bd0cb13d462ecf4d9aaa6ea7571bd5548008163d0499eae2fbf40 failed signature verification.
2023-12-15T15:19:09.246-05:00	END RequestId: 9974d1b8-b59e-4793-9eea-eceabd288cce
2023-12-15T15:19:09.246-05:00	REPORT RequestId: 9974d1b8-b59e-4793-9eea-eceabd288cce Duration: 622.28 ms Billed Duration: 623 ms Memory Size: 1024 MB Max Memory Used: 101 MB
```

</tab>
</tabs>


#### Tear it down

When you are done experimenting with this setup you can run the following command to tear down the created infrastructure:

```sh
sam delete --stack-name aws-signer-image-verification
```

::: warning
The `AWS::Signer::SigningProfile` will be cancelled as part of the CloudFormation stack teardown, but not revoked. You
may also wish to revoke this signing profile to ensure that it can not be used in the future.
:::