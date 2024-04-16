const fs = require("fs").promises;
const { exec } = require("child_process");

async function execAsync() {
    return new Promise((resolve, reject) => {
        exec(...arguments, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function build() {
    const args = process.argv.slice(2);

    if (args.length !== 1) {
        console.error("Usage: node build.js <mode>");
        process.exit(1);
    }

    switch (args[0]) {
        case "verify":
            return await verify();
        case "production":
            return await production();
        default:
            console.error("Invalid mode specified.");
            return 1;
    }
}

async function verify() {
    // Ensure manifest.json version matches package.json version
    const manifest = JSON.parse(await fs.readFile("src/static/manifest.json", "utf8"));
    const nodePackage = JSON.parse(await fs.readFile("package.json", "utf8"));

    if (manifest.version !== nodePackage.version) {
        console.error(
            `Version mismatch between manifest.json (${manifest.version}) and package.json (${nodePackage.version}).`
        );
        return 1;
    }

    // Verify that an already built version with the same version number does not exist
    try {
        await fs.access(`build/${nodePackage.version}`);
        console.error(
            `A build with the same version number (${nodePackage.version}) already exists.`
        );
        return 1;
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }

    console.log("Verification successful.");
    return 0;
}

async function production() {
    let verifyResult = await verify();
    if (verifyResult !== 0) {
        return verifyResult;
    }

    // Create a zip file of the dist directory
    const nodePackage = JSON.parse(await fs.readFile("package.json", "utf8"));
    await fs.mkdir(`build/${nodePackage.version}`, { recursive: true });

    const browsers = {
        chrome: chrome,
        firefox: firefox,
        edge: chrome,
    };

    for (const browser in browsers) {
        // Copy the dist folder to a new temp folder
        console.log(`Creating build/${nodePackage.version}/${browser}`);
        await fs.mkdir(`build/${nodePackage.version}/${browser}`);

        console.log(`Copying dist to build/${nodePackage.version}/${browser}`);
        await execAsync(`cp -r dist/* build/${nodePackage.version}/${browser}`);

        await browsers[browser](`build/${nodePackage.version}/${browser}`);

        // Zip the temp folder
        console.log(`Zipping build/${nodePackage.version}/${browser}`);
        await execAsync(
            `zip -r build/${nodePackage.version}/SchoologyPlus-v${nodePackage.version}-${browser}.zip build/${nodePackage.version}/${browser}`
        );

        // Remove the temp folder
        console.log(`Removing build/${nodePackage.version}/${browser}`);
        await execAsync(`rm -r build/${nodePackage.version}/${browser}`);
    }

    return 0;
}

async function chrome(directory) {
    console.log("Running Chrome build tasks");

    const manifest = JSON.parse(await fs.readFile(`${directory}/manifest.json`, "utf8"));

    delete manifest.browser_specific_settings;
    manifest.optional_permissions = manifest.optional_permissions.filter(
        permission => permission !== "<all_urls>"
    );

    delete manifest.background.scripts;

    await fs.writeFile(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2));
}

async function firefox(directory) {
    console.log("Running Firefox build tasks");

    const manifest = JSON.parse(await fs.readFile(`${directory}/manifest.json`, "utf8"));

    delete manifest.background.service_worker;

    manifest.content_scripts[0].js = manifest.content_scripts[0].js.filter(
        script => script !== "lib/google-analytics.js"
    );

    await fs.rm(`${directory}/lib/google-analytics.js`);

    manifest.permissions = manifest.permissions.filter(permission => permission !== "offscreen");

    await fs.writeFile(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2));
}

build().then(code => process.exit(code));
