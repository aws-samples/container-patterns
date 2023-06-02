import YAML from 'yaml'
import { Validator } from 'jsonschema'
import { readFileSync } from 'node:fs';
import schemaErrorMessage from '../shared/schema-error-message.js';
import { globSync } from 'glob';
import * as fm from 'front-matter';

const frontmatterExtractor = fm.default;

const v = new Validator();

let frontmatterSchema;

export default function (state) {
  let totalErrors = 0;

  // Load the frontmatter schema
  let frontmatterSchemaFile;
  try {
    frontmatterSchemaFile = readFileSync('./lint/schemas/author-frontmatter-schema.json', 'utf8')
  } catch (e) {
    console.error('❌ Expected file ./lint/schemas/author-frontmatter-schema.json', e);
    state.errors++;
    return;
  }

  // Parse the schema file
  try {
    frontmatterSchema = JSON.parse(frontmatterSchemaFile);
  } catch (e) {
    console.error('❌ Author frontmatter schema file itself is invalid', e)
    state.errors++;
    return;
  }

  // Find all matching markdown files
  const markdownFiles = globSync('./author/*.md');

  for (let file of markdownFiles) {
    validateFile(file, state);
  }
}

function validateFile(filename, state) {
  let totalErrors = 0;

  // Load the Markdown content
  let file;
  try {
    file = readFileSync(filename, 'utf8')
  } catch (e) {
    console.error(`❌ Unable to read file ${file}`, e);
    state.errors++;
    return;
  }

  // Extract the frontmatter from the file
  const meta = frontmatterExtractor(file);
  const metaYAML = meta.frontmatter;

  // Parse the YAML of the frontmatter
  let frontmatter;
  try {
    frontmatter = YAML.parse(metaYAML)
  } catch (e) {
    console.error('❌ Failed to parse YAML content of frontmatter in ${filename}', e);
    state.errors++;
    return;
  }

  // Validate that the frontmatter matches the schema
  const results = v.validate(frontmatter, frontmatterSchema);

  if (results.errors.length) {
    console.log(`❌ ${filename} has ${results.errors.length} frontmatter schema validation error(s) listed below`)

    for (var error of results.errors) {
      console.log(schemaErrorMessage(error));
    }

    totalErrors += results.errors.length;
  }

  // Now make sure that all authors are valid
  if (!state.authors) {
    console.error(`❌ Unable to validate ${filename} author because authors.yml was malformed`);
    totalErrors++;
  } else {
    state.authorsById = {};
    for (let author of state.authors) {
      state.authorsById[author.id] = author;
    }

    if (!state.authorsById[frontmatter.authorId]) {
      console.error(`❌ ${filename} authorId '${frontmatter.authorId}' needs to be added to ./data/authors.yml`);
      totalErrors++;
    }
  }

  if (totalErrors == 0) {
    console.log(`✅ ${filename} looks good`);
  }

  state.errors += totalErrors;
}