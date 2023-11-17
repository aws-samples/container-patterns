# Exit immediately if linter fails
# set +e

# Check the repo pattern content against our defined schemas
echo "Linting content";
node ./lint/lint.js

echo "Linting CloudFormation"

# Install latest release of cfn-lint
if ! command -v cfn-lint &> /dev/null
then
    pip install cfn-lint
fi

# Check for common CloudFormation issues according
# to the rules in .cfnlintrc.yml
cfn-lint -f pretty

echo "Checking CloudFormation against policy as code rules"

# Install latest release of cfn-guard
if ! command -v ~/.guard/bin/cfn-guard &> /dev/null
then
  curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/aws-cloudformation/cloudformation-guard/main/install-guard.sh | sh
fi

# Validate CFN files against included policy as code rules
~/.guard/bin/cfn-guard validate --data ./pattern/**/files/*.yml --rules ./lint/guard
