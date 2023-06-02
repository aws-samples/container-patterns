import YAML from 'yaml'
import { Validator } from 'jsonschema'
import { readFileSync } from 'node:fs';
import schemaErrorMessage from '../shared/schema-error-message.js';

const v = new Validator();

export default function (state) {
  // Load the authors YAML file
  let authorsFile;
  try {
    authorsFile = readFileSync('./data/authors.yml', 'utf8')
  } catch (e) {
    console.error('❌ Expected file ./data/authors.yml', e);
    state.errors++;
    return;
  }

  // Parse the YAML
  let authors;
  try {
    authors = YAML.parse(authorsFile)
  } catch (e) {
    console.error('❌ Failed to parse YAML content of ./data/authors.yml', e);
    state.errors++;
    return;
  }

  // Load the authors.yml schema
  let authorsSchemaFile;
  try {
    authorsSchemaFile = readFileSync('./lint/schemas/authors-schema.json', 'utf8')
  } catch (e) {
    console.error('❌ Expected file ./lint/schemas/authors-schema.json', e);
    state.errors++;
    return;
  }

  // Parse the schema file
  let authorsSchema;
  try {
    authorsSchema = JSON.parse(authorsSchemaFile);
  } catch (e) {
    console.error('❌ Author schema file itself is invalid', e)
    state.errors++;
    return;
  }

  // Now validate the authors.yml content against the schema
  const results = v.validate(authors, authorsSchema)

  if (results.errors.length == 0) {
    console.log('✅ ./data/authors.yml has valid YAML')

    // Share the author list we loaded with other rules
    state.authors = authors;
    return;
  }

  console.log(`❌ ./data/authors.yml has ${results.errors.length} error(s) listed below`)

  for (var error of results.errors) {
    console.log(schemaErrorMessage(error));
  }

  state.errors += results.errors.length;
  return;
}