import YAML from 'yaml'
import { Validator } from 'jsonschema'
import { readFileSync } from 'node:fs';
import schemaErrorMessage from '../shared/schema-error-message.js';

const v = new Validator();

export default function (state) {
  // Load the filterGroups YAML file
  let filterGroupsFile;
  try {
    filterGroupsFile = readFileSync('./data/filter-groups.yml', 'utf8')
  } catch (e) {
    console.error('❌ Expected file ./data/filter-groups.yml', e);
    state.errors++;
    return;
  }

  // Parse the YAML
  let filterGroups;
  try {
    filterGroups = YAML.parse(filterGroupsFile)
  } catch (e) {
    console.error('❌ Failed to parse YAML content of ./data/filter-groups.yml', e);
    state.errors++;
    return;
  }

  // Load the filter-groups.yml schema
  let filterGroupsSchemaFile;
  try {
    filterGroupsSchemaFile = readFileSync('./lint/schemas/filter-groups-schema.json', 'utf8')
  } catch (e) {
    console.error('❌ Expected file ./lint/schemas/filter-groups-schema.json', e);
    state.errors++;
    return;
  }

  // Parse the schema file
  let filterGroupsSchema;
  try {
    filterGroupsSchema = JSON.parse(filterGroupsSchemaFile);
  } catch (e) {
    console.error('❌ filter-groups-schema.json file itself is invalid', e)
    state.errors++;
    return;
  }

  // Now validate the filter-groups.yml content against the schema
  const results = v.validate(filterGroups, filterGroupsSchema)
  let totalErrors = 0;

  if (results.errors.length) {
    console.log(`❌ ./data/filter-groups.yml has ${results.errors.length} schema validation error(s) listed below`)

    for (var error of results.errors) {
      console.log(schemaErrorMessage(error));
    }

    totalErrors += results.errors.length;
  }

  // Do an additional validation
  for (let filter of filterGroups) {
    if (filter.checked) {
      console.error(`❌ ./data/filter-groups.yml, the filter '${filter.key}=${filter.value}' should not be checked by default`)
      totalErrors++;
    }
  }

  if (totalErrors == 0) {
    console.log('✅ ./data/filter-groups.yml has valid YAML')
    state.filterGroups = filterGroups;
    return;
  } else {
    state.errors += totalErrors;
    return;
  }
}
