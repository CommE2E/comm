# Shared workflows

## Inspect database with TablePlus

Feel free to use any MariaDB administration platform that you’re comfortable with. PHP was deprecated in macOS 12 (Monterey), leading many of us to switch to [TablePlus](https://tableplus.com/).

After running `nix develop` which will create a MariaDB instance, you need to open a new connection. After opening TablePlus, click the “Create a new connection” text at the bottom of the window that appears.

- Alternatively, you can navigate through Connection → New... in the menu at the top of the display.

Choose MariaDB from the database options that appear. You’ll be prompted for:

- Name (Comm)
- Check “Use socket”. Enter socket path: (`/Users/<user>/.local/share/MariaDB/mysql.sock`, substituting `<user>` for your user. `<user>` can be found by running `echo $USER` in a terminal)

## Codegen

We use a couple of tools that automatically generate code. There is always a source of truth – usually some file(s) with schemas.

### Codegen for JSI

JSI is a framework in React Native that allows C++ and JS to communicate synchronously and directly. The codegen for JSI takes a Flow schema and generates C++ files that enable communication between JS and C++ in `react-native` apps.

The script to generate this code is written in JavaScript and is included as a npm package so no additional software is needed to use it. The schema has to be defined in Flow as an interface, and that interface must inherit from react-native’s `TurboModule` interface.

To run the JSI codegen, just run:

```
cd native
yarn codegen-jsi
```

The input Flow schemas are located in `native/schema`.

# Working with Phabricator

## Phabricator

The last configuration step is to set up an account on Phabricator, where we handle code review. Start by [logging in to Phabricator](https://phab.comm.dev) using your GitHub account.

Next, make sure you’re inside the directory containing the Comm Git repository, and run the following command:

```
arc install-certificate
```

This command will help you connect your Phabricator account with the local Arcanist instance, allowing you to run `arc diff` and `arc land` commands.

## Creating a new diff

The biggest difference between GitHub PRs and Phabricator diffs is that a PR corresponds to a branch, whereas a diff corresponds to a commit.

When you have a commit ready and want to submit it for code review, just run `arc diff` from within the Comm Git repo. `arc diff` will look at the most recent commit in `git log` and create a new diff for it.

## Updating a diff

With GitHub PRs, updates are usually performed by adding on more commits. In contrast, in Phabricator a diff is updated by simply amending the existing commit and running `arc diff` again.

When you run `arc diff`, it looks for a `Differential Revision: ` line in the commit text of the most recent commit. If Arcanist finds that line, it will assume you want to update the existing diff rather than create a new one. Other Arcanist commands such as `arc amend` (which amends commit text to match a diff on Phabricator) also look for the `Differential Revision: ` line.

## Working with a stack

One of the advantages of Phabricator’s approach is that larger, multi-part changes can be split up into smaller pieces for review. These multi-part changes are usually referred to as a “stack” of diffs.

When creating a diff that depends on another, you should make sure to create a dependency relationship between those two diffs, so that your reviewers can see the stack on Phabricator. The easiest way to do that is to include `Depends on D123` in the commit text of the child commit, but the dependency relationship can also be specified using the Phabricator web UI.

You’ll find that mastering Git’s interactive rebase feature (`git rebase -i`) will help you a lot when working with stacks. Interactive rebases make it easy to “diff up” multiple commits at once, or to amend a specific commit in the middle of a stack in response to a review.

## Committing a diff

After your diff has been accepted, you should be able to land it. To land a diff just run `arc land` from within the repository.

If you have a stack of unlanded commits in your Git branch, `arc land` will attempt to land all of those diffs. If some of the diffs in your stack haven’t been accepted yet, you’ll need to create a new, separate branch that contains just the commits you want to land before running `arc land`.

Note that you need commit rights to the repository in order to run `arc land`. If you don’t have commit rights, reach out to @ashoat for assistance.

## Final notes

When developing, I usually just pop up three terminal windows, one for `yarn dev` in each of keyserver, web, and native.

Note that it’s currently only possible to create a user account using the iOS or Android apps. The website supports logging in, but does not support account creation.

Good luck, and let @ashoat know if you have any questions!
