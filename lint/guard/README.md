# cfn-guard rules

The rules in this folder are used to validate that CloudFormation
templates in this repo adhere to certain best practices.

#### Usage

1. Install `cfn-guard`

```sh
curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/aws-cloudformation/cloudformation-guard/main/install-guard.sh | sh
export PATH=~/.guard/bin:$PATH
cfn-guard --version
```

Other system install instructions at: https://docs.aws.amazon.com/cfn-guard/latest/ug/setting-up-linux.html

2. From the repository root:

```sh
cfn-guard validate --data ./pattern/**/files/*.yml --rules ./lint/guard
```

#### Testing Guard Rules

```sh
cfn-guard test --rules-file awslogs-logging-driver.guard --test-data awslogs-non-blocking-tests.yaml
```