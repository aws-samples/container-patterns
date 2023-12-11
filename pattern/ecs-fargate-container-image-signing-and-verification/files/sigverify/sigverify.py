# // Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# // SPDX-License-Identifier: Apache-2.0
import json
import subprocess
import boto3
import base64
import os
from datetime import datetime

# ------ static initialization code ------
# values needed for trust policy
region=os.environ["AWS_REGION"]
signing_profile_arn=os.environ["SIGNING_PROFILE_ARN"]

# Notation CLI files are at /opt/notation by default
# But in Lambda, this path is readonly, and we need to write the trust policy
# so we need to move to /tmp which is the only writeable folder for Lambda
notation_files_path=os.environ["XDG_CONFIG_HOME"]
subprocess.run(['mkdir', '-p', notation_files_path])
subprocess.run(['cp', '-R', '/opt/notation/', notation_files_path])


# Notation normally requires a credentials store and crendentials store helper, but
# in Lambda we are not able to use these.
def notation_verify_signature(ecr_client, container_image):
    auth_token=ecr_client.get_authorization_token()
    username, password = base64.b64decode(auth_token['authorizationData'][0]['authorizationToken']).decode('utf-8').split(":")
    # can add --verbose argument to notation verify if needed
    result=subprocess.run(['notation', 'verify', '-u', username, '-p', password, container_image])
    return result

def configure_trust_policy():
    # There are a few options for this. The trust policy can be imported
    # from somewhere like SSM Parameter Store, Secrets Manager or even baked directly
    # into the lambda
    trust_policy = {
      "version": "1.0",
      "trustPolicies": [
          {
            "name":"aws-signer-tp",
            "registryScopes":[
              "*"
            ],
            "signatureVerification":{
              "level":"strict"
            },
            "trustStores":[
              "signingAuthority:aws-signer-ts"
            ],
            "trustedIdentities":[
              signing_profile_arn
            ]
        }
      ]
    }
    temp_trust_policy='/tmp/trustpolicy.json'
    trust_policy_file=open(temp_trust_policy, "w")
    trust_policy_file.write(json.dumps(trust_policy))
    trust_policy_file.close()
    # Import new trust policy. This step is required.
    subprocess.run(['notation', 'policy', 'import', temp_trust_policy])

def lambda_handler(event, context):

    # only run when we first provision the container
    if event.get('detail').get('lastStatus') != 'PROVISIONING':
        return None

    # get all containers from event
    container_images=[container.get('image') for container in event.get('detail').get('containers')]

    if len(container_images) <=0:
        return None

    ecr_client = boto3.client('ecr', region_name=region)
    # verify all container signatures
    for container_image in container_images:

        result=notation_verify_signature(ecr_client, container_image)

        # perform some action if signature verification fails
        if result.returncode != 0:
            print(f'{container_image} failed signature verification.')
            # From here you can trigger an alarm or send an email.
            # In this example, we simply call ECS StopTask.
            # ecs_client = boto3.client('ecs', region_name=region)
            # ecs_client.stop_task(
            #     cluster=event.get('detail').get('clusterArn'),
            #     reason='Stopped by container image signature verification lambda.',
            #     task=event.get('detail').get('taskArn').split('/')[-1]
            # )
            return {
                'statusCode': 200,
                'body': json.dumps(f"Signature verification for '{container_image}' failed.")
            }

    return {
        'statusCode': 200,
        'body': json.dumps(f"Signature verification for '{container_image}' succeeded.")
    }


# Setup the trust policy to be used, outside of the main handler.
configure_trust_policy()