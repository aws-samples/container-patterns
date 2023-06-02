import YAML from 'yaml'
import { readFileSync } from 'node:fs';

export default function (state) {
  let totalErrors = 0;

  if (!state.filters) {
    console.error(`❌ Filters were malformed so can't validate filter coherence`);
    state.errors++;
    return;
  }

  if (!state.filterGroups) {
    console.error(`❌ Filter groups were malformed so can't validate filter coherence`);
    state.errors++;
    return;
  }

  state.filterGroupsByKey = {};
  for (let filterGroup of state.filterGroups) {
    state.filterGroupsByKey[filterGroup.key] = filterGroup;
  }

  state.filtersByKey = {};
  for (let filter of state.filters) {
    if (!state.filtersByKey[filter.key]) {
      state.filtersByKey[filter.key] = [];
    }
    state.filtersByKey[filter.key].push(filter);
  }

  // Ensure that all filter groups actually have filters
  for (let filterGroup of state.filterGroups) {
    if (!state.filtersByKey[filterGroup.key]) {
      console.error(`❌ Encountered filter group with key '${filterGroup.key}', but there are no filters with the same key`);
      totalErrors++;
    }
  }

  // Ensure that all filter keys have filter groups
  for (let filterKey in state.filtersByKey) {
    if (!state.filterGroupsByKey[filterKey]) {
      console.error(`❌ Encountered filter with key '${filterKey}', but there is no matching filter group with the same key`);
      totalErrors++;
    }

    if (state.filtersByKey[filterKey].length < 2) {
      console.error(`❌ Only one filter exists with key '${filterKey}'. Don't create new filters unless there are actually multiple choices for the filter`);
      totalErrors++;
    }
  }

  if (totalErrors == 0) {
    console.log('✅ Filters and filter groups look reasonable')
  }

  state.errors += totalErrors;
  return;
}
