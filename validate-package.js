const fs = require('fs');
const exec = require('child_process').exec;
const core = require('@actions/core');
const semver = require('semver');

const successColor = '\x1b[42m';
const errorColor = '\x1b[41m';

const packageJson = fs.readFileSync('./package.json', 'utf8');
const { name: packageName, version: packageVersion } = JSON.parse(packageJson);

const logResult = (message, { failed } = {}) => console.log(failed ? errorColor : successColor, message, '\x1b[0m');

exec(`npm view ${packageName} dist-tags --json`, (err, stdout) => {
    let isFirstDeployment = false;

    if (err) {
        /* if the is an error with 'code E404', it means that there is no package
         * with this name found in the registry, which means it is the first deployment!
         * is the error someting else, we exit
         */
        if (!err.message.includes('code E404')) {
            console.error(err);
            process.exit(1); // Exit with error code
        }
        isFirstDeployment = true;
    }

    // check whether packageVersion is a proper semantic version
    if (!semver.valid(packageVersion)) {
        logResult('❌ De versie in het package.json is niet valide! Bekijk https://semver.org/ voor meer info.', {
            failed: true,
        });
        process.exit(1); // Exit with error code
    }

    console.log(stdout);
    // parse output of stdout, but keep in mind whether it is the first deployment or not!
    const { beta, latest, next } = JSON.parse(
        isFirstDeployment || stdout.trim().length === 0
            ? JSON.stringify({ beta: undefined, latest: undefined, next: undefined })
            : stdout.trim(),
    );

    console.log(`versiecheck:`);
    console.log(` - laatst gedeployede latest versie: ${latest ?? 'geen eerdere release'}`);
    console.log(` - laatste beta versie: ${beta ?? 'geen eerdere release'}`);
    console.log(` - laatste next versie: ${next ?? 'geen eerdere release'}`);
    console.log(`versie in package.json: ${packageVersion}`);

    // this function will exit the process if local version is lower than on the registry
    const verifyVersion = (version, errorMessage) => {
        if (!version) {
            // no version information available, falling back to default (0.0.0)
            version = '0.0.0';
        }
        if (semver.lte(packageVersion, version)) {
            logResult(`❌ ${errorMessage}`, { failed: true });
            process.exit(1);
        }
    };

    const prereleaseComponents = semver.prerelease(packageVersion);
    const isPrerelease = !!prereleaseComponents;

    /**
     * we'll use this tag as output of this file. We need to determine what kind of version the package.json is using now..
     * supported release kinds;
     * - regular release. Example: 0.7.1 => publishtag 'latest'
     * - beta release. Example: 1.3.0-beta.1 => publishtag 'beta'
     * - next release. Example: 1.0.0-next.0 => publishtag 'next'
     */
    let publishTag;

    if (!isPrerelease) {
        verifyVersion(
            latest,
            `package.json versie is nog niet opgehoogd ten opzichte van laatste release op npm (${packageVersion} vs ${latest})`,
        );
        publishTag = 'latest';
    }

    if (isPrerelease) {
        const [kind] = prereleaseComponents;
        if (kind === 'beta') {
            // beta version
            verifyVersion(
                beta,
                `package.json versie is nog niet opgehoogd ten opzichte van laatste release op npm (${packageVersion} vs ${beta})`,
            );
            publishTag = 'beta';
        } else if (kind === 'next') {
            // next version
            verifyVersion(
                next,
                `package.json versie is nog niet opgehoogd ten opzichte van laatste release op npm (${packageVersion} vs ${next})`,
            );
            publishTag = 'next';
        } else {
            console.error(
                `een onbekend soort prerelease is gevonden; '${kind}'. We ondersteunen enkel 'next' en 'beta'`,
            );
            process.exit(1);
        }
    }

    // if we've arrived here, we are sure the package.json version is a valid semver string and we determined our publish tag
    // this is used for github actions
    core.setOutput('publishtag', publishTag);
    isFirstDeployment
        ? logResult('✔ Eerste release van dit package!')
        : logResult('✔ package.json versie is opgehoogd ten opzichte van de vorige versie!');
});
