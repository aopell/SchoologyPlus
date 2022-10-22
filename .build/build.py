import argparse
import json
import os
import sys
import shutil
import copy
import errno

try:
    import sass
except ModuleNotFoundError:
    print("ERROR: Missing SASS library. Please install using 'pip install libsass'")
    sys.exit(1)

class BuildRules:
    def __init__(self, config):
        self.excluded_files = config["excluded_files"] or []
        self.properties = config["properties"] or {}

EXCLUDED_FILES = [".build", ".git", ".github", ".vscode", "SchoologyPlus.zip", "webstore-description.txt", "sass"]

chrome_rules = BuildRules({
    "excluded_files": [],
    "properties": { }
})

firefox_rules = BuildRules({
    "excluded_files": [
        "lib/js/analytics.js"
    ],
    "properties": { }
})

targets = {
    "chrome": chrome_rules,
    "firefox": firefox_rules,
    "edge": chrome_rules
}

parser = argparse.ArgumentParser(description="Schoology Plus build script")
parser.add_argument("target", choices=list(targets.keys()) + ["all", "dev"], help="Which target to build")
args = parser.parse_args()

os.chdir(os.path.dirname(__file__) + "/..")

with open("manifest.json", "r") as manifestFile:
    global manifest
    manifest = json.loads(manifestFile.read())
    manifestFile.close()

print("+ Starting Schoology Plus build script")
print(f"Building version {manifest['version']}")

def removePathFromManifest(man, path, traversal=""):
    if type(man) == list:
        try:
            man.remove(path)
            print(f"Removed {path} from manifest: {traversal}")
        except ValueError:
            i = 0
            for item in man:
                removePathFromManifest(item, path, f"{traversal}[{i}]")
                i += 1
    elif type(man) == dict:
        for key in man.keys():
            removePathFromManifest(man[key], path, f"{traversal}.{key}")

def copyFileOrDirectory(src, dst):
    try:
        shutil.copytree(src, dst)
    except OSError as exc:
        if exc.errno == errno.ENOTDIR:
            shutil.copy(src, dst)
        else: raise

def compileSCSS():
    scss_dirs = [('scss/modern', 'css/modern')]
    for dir_pair in scss_dirs:
        print(f"Compiling SCSS in directory '{dir_pair[0]}' to directory '{dir_pair[1]}'")
        sass.compile(dirname=dir_pair, output_style='expanded')

compileSCSS()

if args.target == "dev":
    sys.exit()

for target in targets:
    if args.target != "all" and args.target != target:
        continue

    print(f'+ Building target "{target}"')
    rules = targets[target]

    try:
        os.makedirs(f".build/{target}")
    except FileExistsError:
        print("Deleting existing directory")
        shutil.rmtree(f".build/{target}")
        os.makedirs(f".build/{target}")

    for path in os.listdir():
        if path not in EXCLUDED_FILES and path not in rules.excluded_files:
            copyFileOrDirectory(path, f".build/{target}/{path}")
    
    targetManifest = copy.deepcopy(manifest)
    
    for path in rules.excluded_files:
        print(f"Removing path {path}")
        removePathFromManifest(targetManifest, path)
        if os.path.exists(f".build/{target}/{path}"):
            os.remove(f".build/{target}/{path}")

    print("Copying properties")
    targetManifest.update(rules.properties)

    with open(f".build/{target}/manifest.json", "w") as manifestFile:
        manifestFile.write(json.dumps(targetManifest, indent=4))
        manifestFile.close()

    print(f"Wrote modified .build/{target}/manifest.json")

    shutil.make_archive(f".build/SchoologyPlus-v{manifest['version']}-{target}", "zip", f".build/{target}")
    print(f"Successfully created SchoologyPlus-v{manifest['version']}-{target}.zip")

    shutil.rmtree(f".build/{target}")
    print("Cleaned up directories")