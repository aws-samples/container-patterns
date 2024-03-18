This pattern uses [CloudFormation Guard](https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html), which can be installed with the following command:

```sh
curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/aws-cloudformation/cloudformation-guard/main/install-guard.sh | sh
export PATH=~/.guard/bin:$PATH
cfn-guard --version
```

You can also see the [install instructions for other systems](https://docs.aws.amazon.com/cfn-guard/latest/ug/setting-up.html).