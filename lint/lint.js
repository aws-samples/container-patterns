import authorsYamlValid from './rules/authors-yaml-valid.js';
import filtersYamlValid from './rules/filters-yaml-valid.js';
import filterGroupsYamlValid from './rules/filter-groups-yaml-valid.js';
import filterGroupingCoherent from './rules/filter-grouping-coherent.js';
import patternFrontmatterValid from './rules/pattern-frontmatter-valid.js';
import authorFrontmatterValid from './rules/author-frontmatter-valid.js';

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