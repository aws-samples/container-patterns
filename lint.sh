# Check the repo pattern content against our defined schemas
echo "Linting content";
node ./lint/lint.js

echo "Linting CloudFormation"

# Install latest release of cfn-lint
pip install cfn-lint

# Check for common CloudFormation issues according
# to the rules in .cfnlintrc.yml
cfn-lint

echo "Checking CloudFormation against policy as code rules"

# Install latest release of cfn-guard
curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/aws-cloudformation/cloudformation-guard/main/install-guard.sh | sh

# Validate CFN files against included policy as code rules
~/.guard/bin/cfn-guard validate --data ./pattern/**/files/*.yml --rules ./lint/guard
