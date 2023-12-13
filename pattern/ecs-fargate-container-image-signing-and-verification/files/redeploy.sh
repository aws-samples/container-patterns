LAMBDA_REPO=$(aws cloudformation describe-stacks --stack-name aws-signer-image-verification --query "Stacks[0].Outputs[?OutputKey=='LambdaRepositoryUri'].OutputValue" --output text)

docker build -t $LAMBDA_REPO --build-arg signing_profile_arn=$SIGNING_PROFILE_ARN ./sigverify
docker push $LAMBDA_REPO
LAMBDA_IMAGE_SHA=$(docker inspect --format='{{index .RepoDigests 0}}' $LAMBDA_REPO)

sam deploy \
  --template-file parent-step-03.yml \
  --stack-name aws-signer-image-verification \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides LambdaImageUri=$LAMBDA_IMAGE_SHA SignedImageUri=$APP_IMAGE_SHA