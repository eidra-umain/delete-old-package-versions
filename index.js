const core = require('@actions/core')
const github = require('@actions/github')
const octokitCore = require('@octokit/core')
const paginate = require('@octokit/plugin-paginate-rest')

async function run() {
    try {
        // get all required input parameters
        const packageNames = core.getInput('package-names').split(",").map(p => p.trim())
        const token = core.getInput('token')
        const packageType = core.getInput('package-type')

        // get all optional input parameters
        const minVersionsToKeep = core.getInput('min-versions-to-keep') ? Number(core.getInput('min-versions-to-keep')) : null
        const versionToDelete = core.getInput('version-to-delete')

        // if both minVersionsToKeep and versionToDelete are null, stop the execution
        if(minVersionsToKeep == null && versionToDelete == null) {
            return core.setFailed("either 'min-versions-to-keep' or 'version-to-delete' needs to be defined")
        }

        // if both minVersionsToKeep and versionToDelete are defined, stop the execution
        if(minVersionsToKeep != null && versionToDelete != null) {
            return core.setFailed("either 'min-versions-to-keep' or 'version-to-delete' should be defined")
        }

        // initialize github octokit api
        const MyOctokit = octokitCore.Octokit.plugin(paginate.paginateRest);
        const octokit = new MyOctokit({ auth: token });

        // get github context information
        const owner = github.context.repo.owner

        // get all packages for the current repository
        const packages = await octokit.paginate('GET /orgs/{org}/packages', {
            package_type: packageType,
            org: owner,
            per_page: 100,
        });

        // only keep packages that match the input packagenames
        const packagesThatMatchNames = packages.filter(p => packageNames.includes(p.name))
        console.info(`found ${packagesThatMatchNames.length} packages to delete versions for`)

        // for every package in this repository
        for (const repoPackage of packagesThatMatchNames) {

            // fetch all the versiobs of this package
            let versions = await octokit.paginate('GET /orgs/{org}/packages/{package_type}/{package_name}/versions', {
                org: owner,
                package_type: packageType,
                package_name: repoPackage.name,
                per_page: 100,
            });

            // select all but the X most recent package versions
            if(minVersionsToKeep != null) {
                versions.splice(0, minVersionsToKeep);
                console.info(`deleting ${versions.length} versions for package "${repoPackage.name}"`)
            }

            // select only the specific version to delete
            else if(versionToDelete != null) {
                versions = versions.filter((version) => version.name === versionToDelete);
                console.info(`deleting ${versions.length} versions for package "${repoPackage.name}"`)
            }

            // neither are defined, to prevent all versions from being deleted, stop the execution
            else {
                return core.setFailed("both 'min-versions-to-keep' and 'version-to-delete' were defined")
            }

            // delete all package versions we dont want to keep
            const deletableVersionPromises = versions.map(version => {
                return octokit.request('DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}', {
                    org: owner,
                    package_type: packageType,
                    package_name: repoPackage.name,
                    package_version_id: version.id,
                });
            })
            await Promise.all(deletableVersionPromises)

            console.info(`deleted ${versions.length} versions for package "${repoPackage.name}"`)
        }

    } catch (e) {
        core.setFailed(e)
    }
}

run() // execute script