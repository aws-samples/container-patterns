# Adding yourself as an author

Check the file at `data/authors.yml` to see if you are already listed as an author.

Authors are represented in YAML format similar to this:

```yaml
- id: peckn
  name: Nathan Peck
  title: Senior Developer Advocate at AWS
  image: /pattern/images/authors/peckn.jpg
  links:
    - type: website
      uri: https://nathanpeck.com
    - type: github
      uri: https://github.com/nathanpeck
    - type: twitter
      uri: https://twitter.com/nathankpeck
```

Create your own custom YAML block and add it to the file if not already present.

For the sake of uniqueness please use your Amazon ID as the value of id if you are an Amazon employee.

## Add your avatar

Author avatar images go into `/public/images/authors/<authorId>.png`. Note that the path in the `data/authors.yml` should be `/pattern/images/authors/<authorId>.png`. Try to keep your avatar a square image of reasonable dimensions and file size. If it looks grainy or it has a gigantic file size then maintainers may ask you update your PR before merge.

## Customizing your bio page

Bio pages are stored at `author/<authorId>.md`

The author page content should look similar to this:

```markdown
---
type: author
authorId: peckn
---

Any freeform text that you want here.

* All markdown is supported
* You can add [links](https://amazon.com) as well.
```

## Check your author bio page

Your author bio page will be published at a URL like this: https://containersonaws.com/pattern/author/peckn

Content from the `data/authors.yml` metadata, and your custom bio page content will be combined to render the bio page.
