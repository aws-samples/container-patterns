import { awscdk, JsonFile } from 'projen';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Pahud Hsieh',
  authorAddress: 'pahudnet@gmail.com',
  cdkVersion: '2.80.0',
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.0.0',
  name: 'ecs-fargate-apigateway-cloudmap-cdk',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/aws-samples/container-patterns.git',
  deps: [
    '@aws-cdk/aws-apigatewayv2-alpha@^2.80.0-alpha.0',
    '@aws-cdk/aws-lambda-python-alpha@^2.80.0-alpha.0',
  ],
  peerDeps: [
    '@aws-cdk/aws-apigatewayv2-alpha@^2.80.0-alpha.0',
    '@aws-cdk/aws-lambda-python-alpha@^2.80.0-alpha.0',
  ],
  devDeps: [
    'aws-cdk@^2.80.0',
  ],
});

// required for vscode eslint extension to locate the tsconfig correctly
project.eslint!.config.parserOptions.tsconfigRootDir = 'pattern/ecs-fargate-apigateway-cloudmap-cdk/files';
/**
 * reset tsconfigRootDir to null as a workaround for eslint CLI
 * see https://github.com/typescript-eslint/typescript-eslint/issues/251#issuecomment-493187240
 */
const tasksJson = project.tryFindObjectFile('.projen/tasks.json')!;
tasksJson.addOverride('tasks.eslint.steps.0.exec', 'eslint --ext .ts,.tsx --fix --no-error-on-unmatched-pattern src test build-tools projenrc .projenrc.ts --parser-options={tsconfigRootDir:null}');

new JsonFile(project, 'cdk.json', {
  obj: {
    app: 'npx ts-node --prefer-ts-exts src/integ.default.ts',
  },
});

const common_exclude = ['cdk.out', 'cdk.context.json', 'yarn-error.log', '.github', '.mergify.yml', 'LICENSE', 'README.md'];
project.npmignore?.exclude(...common_exclude);
project.gitignore.exclude(...common_exclude);

project.synth();