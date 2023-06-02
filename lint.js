import authorsYamlValid from './lint/rules/authors-yaml-valid.js';
import filtersYamlValid from './lint/rules/filters-yaml-valid.js';
import filterGroupsYamlValid from './lint/rules/filter-groups-yaml-valid.js';
import filterGroupingCoherent from './lint/rules/filter-grouping-coherent.js';
import patternFrontmatterValid from './lint/rules/pattern-frontmatter-valid.js';
import authorFrontmatterValid from './lint/rules/author-frontmatter-valid.js';

const state = {
  errors: 0
};

authorsYamlValid(state);
filtersYamlValid(state);
filterGroupsYamlValid(state);
filterGroupingCoherent(state);
patternFrontmatterValid(state);
authorFrontmatterValid(state);

if (state.errors == 0) {
  console.log('\n✅ Everything looks great and ready to merge!')
  process.exit(0);
} else {
  console.error(`\n❌ ${state.errors} total error(s) listed above. Fix problems across all files and then try again.`)
  process.exit(1);
}