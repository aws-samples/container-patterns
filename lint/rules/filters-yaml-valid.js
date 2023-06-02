import YAML from 'yaml'
import { Validator } from 'jsonschema'
import { readFileSync } from 'node:fs';
import schemaErrorMessage from '../shared/schema-error-message.js';

const v = new Validator();

export default function (state) {
  // Load the filters YAML file
  let filtersFile;
  try {
    filtersFile = readFileSync('./data/filters.yml', 'utf8')
  } catch (e) {
    console.error('❌ Expected file ./data/filters.yml', e);
    state.errors++;
    return;
  }

  // Parse the YAML
  let filters;
  try {
    filters = YAML.parse(filtersFile)
  } catch (e) {
    console.error('❌ Failed to parse YAML content of ./data/filters.yml', e);
    state.errors++;
    return;
  }

  // Load the filters.yml schema
  let filtersSchemaFile;
  try {
    filtersSchemaFile = readFileSync('./lint/schemas/filters-schema.json', 'utf8')
  } catch (e) {
    console.error('❌ Expected file ./lint/schemas/filters-schema.json', e);
    state.errors++;
    return;
  }

  // Parse the schema file
  let filtersSchema;
  try {
    filtersSchema = JSON.parse(filtersSchemaFile);
  } catch (e) {
    console.error('❌ Filters schema file itself is invalid', e)
    state.errors++;
    return;
  }

  // Now validate the filters.yml content against the schema
  const results = v.validate(filters, filtersSchema)
  let totalErrors = 0;

  if (results.errors.length) {
    console.log(`❌ ./data/filters.yml has ${results.errors.length} schema validation error(s) listed below`)

    for (var error of results.errors) {
      console.log(schemaErrorMessage(error));
    }

    totalErrors += results.errors.length;
  }

  // Do an additional validation
  for (let filter of filters) {
    if (filter.checked) {
      console.error(`❌ ./data/filters.yml, the filter '${filter.key}=${filter.value}' should not be checked by default`)
      totalErrors++;
    }
  }

  if (totalErrors == 0) {
    console.log('✅ ./data/filters.yml has valid YAML')

    // Share loaded filters with other rules
    state.filters = filters;
    return;
  } else {
    state.errors += totalErrors;
    return;
  }
}
