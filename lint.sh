#!/bin/bash

# Custom prompt messages
source ./prompt

# Check command error codes and add info to report summary
report() {
  if [[ $? -eq 0 ]]
    then
        success "$1 linting looks good!" >> report.txt
    else
        fail "$1 linting failed! Please check the logs for more info." >> report.txt
  fi
}

linebreak() {
  echo ''
}

# Check the repo pattern content against our defined schemas
lintContent() {
  info "Linting content";
  node ./lint/lint.js

  report 'Pattern content'
}

# Lint CloudFormation templates
cfnLint() {
  linebreak

  info "Linting CloudFormation"

  linebreak 
  
  # Install latest release of cfn-lint
  if ! command -v cfn-lint &> /dev/null
  then
      pip install cfn-lint
      success 'cfn-lint installed successfully!' >> report.txt
  fi

  # Check for common CloudFormation issues according
  # to the rules in .cfnlintrc.yml
  cfn-lint -f pretty

  report 'CloudFormation'
}

# Check CloudFormation templates against defined policy
cfnPolicyCheck() {
  linebreak
  
  info "Checking CloudFormation against policy as code rules"
  
  linebreak

  # Install latest release of cfn-guard
  if ! command -v ~/.guard/bin/cfn-guard &> /dev/null
  then
    curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/aws-cloudformation/cloudformation-guard/main/install-guard.sh | sh
    success "cfn-guard installed successfully!" >> report.txt
  fi

  # Validate CFN files against included policy as code rules
  ~/.guard/bin/cfn-guard validate --data ./pattern/**/files/*.yml --rules ./lint/guard

  report 'CloudFormation policy'
}

# Call functions
lintContent
cfnLint
cfnPolicyCheck

# Print summary report
cat report.txt

# Cleanup summary report
if  grep -q "FAIL" report.txt
then
  rm -rf report.txt
  exit 1
else
  rm -rf report.txt
fi
