# Repository Structure

This repository has the following structure and important files

- `data` - Metadata about the content on the website
   - `data/filters.yml` - The list of filters that can be applied to content
   - `data/filter-groups.yml` - How those filters are grouped into categories
   - `data/authors.yml` - A list of the metadata for the pattern authors
- `pattern` - Folder contains all the patterns published on the website
   - `pattern/<pattern-name>` - A folder containing all the data for a specific published pattern
     - `pattern/<pattern-name>/index.md` - Markdown text file with the content of the pattern page itself.
     - `pattern/<pattern-name>/files` - A folder to hold any other files associated with the pattern, such as code, images, etc
- `author` - Folder contains the detail pages for each pattern author
    - `author/<authorId>.md` - The custom bio content for each author profile page.
- `public` - Static files that are published as part of the website
    - `public/images/authors` - A folder full of author avatars
- `lint` - A folder that contains the validation rules that run against all submissions
    - `lint/rules` - The high level rules that must pass
    - `lint/schemas` - JSON Schema documents that describe all metadata structures
- `lint.js` - Entrypoint for the linter

### Naming conventions

1. Pattern names should be long, descriptive, with appropriate keywords so that they can be found by search engines
2. The filenames for author avatars should match the author ID that was added to `data/authors.yml`