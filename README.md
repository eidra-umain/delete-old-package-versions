
# Delete Old Package Versions

this package can do two things
* delete all versions of packages defined in "package-names" except for the "min-versions-to-keep"
* delete a specific "version-to-delete" for packages defined in "package-names" 


## Installation

run npm to fetch node modules
```bash
  npm install
```
to publish a new version push a new tag to main:

```bash
  git tag v1.0.0 HEAD
  git push origin --tags  
```

## How to use

```yaml
- name: Delete packages
  uses: apegroup/delete-old-package-versions@v0.0.13
  with:
    package-names: ${{ env.PACKAGE_NAMES }}
    package-type: maven
    token: ${{ secrets.GITHUB_TOKEN }}

    # you can only set one of these two
    min-versions-to-keep: 10 # Keep the 10 most recent releases.
    version-to-delete: '1.0.0' # delete only version 1.0.0
```
