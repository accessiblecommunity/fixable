# **fix**able

`fixable`, provided by [Accessible Community](https://www.accessiblecommunity.org), is a site designed to show common accessibility errors and how to fix them.

## Repository layout

* The [`site`](https://github.com/accessiblecommunity/fixable/tree/main/site) folder contains the javascript code used to build the site.
    * `fixable` is powered by [Astro](https://astro.build/).

## Setting up a Development Environment

If you don't have one, we recommend installing an IDE that supports multiple languages (Python, Javascript, HTML/CSS, etc). The recommendations are [VS Code](https://code.visualstudio.com/) or [Sublime Text](https://www.sublimetext.com/), but this is a developer choice.

The next step is to determine which development environment you would like to use. You can choose between a couple of options:

- A direct Node.js install.
- Running in a Docker container.

### Setting up a Development Environment using Node

**Note:** `npm` commands should be run **within the `site` directory**.

1. Install the [LTS version of Node](https://nodejs.org/en/download/prebuilt-installer/current) on your development machine.
   - If you need to manage multiple Node versions, you can use
     [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm)
1. Run `npm install` within the `site` directory to install the JS dependencies.
1. Run `npm start` within the `site` directory to run the development server.

Other useful npm commands within the `site` directory:

- `npm run check` to check for TypeScript errors
- `npm run build` to create a production build
- `npm run preview` to preview the production build created by `npm run build`
- `npm run update-wcag` to update `wcag*.json` files under `src/lib`
  (this also runs `check` in case any updates impact currently-documented breaks)

### Broken and Fixed Variants

This repository includes components designed to allow implementing both "broken" and "fixed" variants side-by-side.
The above commands run the "broken" variant by default.

To produce the "fixed" output:

- `npm run dev:fixed` to run the dev server
- `npm run build:fixed` to run a build (previewable as before via `npm run preview`)

Note that the default "broken" variant has been the initial focus of development,
so the "fixed" variant is even more work-in-progress.

### Setting up a Development Environment using Docker

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop) or another way to run a containerized environment.
  * If on Windows, we recommend installing the [Linux Subsystem](https://learn.microsoft.com/en-us/windows/wsl/install) to help performance, but it’s not required. See [configuring Docker Desktop to use WSL 2](https://docs.docker.com/desktop/wsl/).
2. There are a series a `make` commands to help you run the commands in Docker. To use those, you'll need to install a way to run `make`.
  * On Windows, use the Linux Subsystem or [chocolatey](https://chocolatey.org/).
  * On Mac, install the Xcode client tools or use [homebrew](https://brew.sh/).
  * If preferred, install some integration with the IDE you are using instead.
    * For instance, [`Makefile` support for VS Code](https://devblogs.microsoft.com/cppblog/now-announcing-makefile-support-in-visual-studio-code/)
3. Run `make serve` to launch the container, install the dependencies and run the development server.

## Authoring Breaks

A couple of components exist to help with implementing broken and fixed variants of features side-by-side.
These work with the commands listed above to produce the broken and fixed variants.

### Defining different attributes on one element: Fixable

```astro
<Fixable as="tagname" ... broken={...} fixed={...}>
<Fixable as={Component} ... broken={...} fixed={...}>
```

- `as`: specifies the tag (string) or component (constructor) to render
- Top-level attributes are common between both broken and fixed variants
- Any attributes specific to either the broken or fixed variant should be
  defined within `broken` or `fixed` (each of these is optional)

### Defining a different set of elements: FixableRegion

```astro
<FixableRegion>
  (broken rendering)
  <... slot="fixed">
    (fixed rendering)
  </...>
</FixableRegion>
```

- Top-level elements are rendered for the broken variant
- The element with `slot="fixed"` is rendered for the fixed variant
  - Multiple top-level elements can be rendered for the fixed variant by
    nesting them under `<Fragment slot="fixed">`

## Documenting Breaks

Breaks can be documented alongside their implementation.

In Astro files (for pages or components):

```ts
/**
 * @break
 * location: Home & Search
 * wcag2: 2.2.2
 * wcag3: Motion
 * description: ...
 * discussionItems:
 *   - ...
 */
```

In Markdown frontmatter (for collection entries):

```yaml
breaks:
  - location: Home & Search
    wcag2: 2.2.2
    wcag3: Motion
    description: ...
    discussionItems:
      - ...
```

In both cases, the same YAML format is used.

### Properties

- **location** - Indicates what part of the site contains the break;
  must exist in `src/content/sections.json`
- **wcag2** - WCAG 2 Success Criterion number(s)
- **wcag3** - WCAG 3 Requirement(s)
- **description** - Description(s) of break(s)
- **discussionItems** - Optional list of discussion items

`wcag2`, `wcag3`, and `description` may be lists or a single value.
Either `wcag2` or `wcag3` (or both) must be specified.

See `src/content.config.ts` for the full zod schema specification for
both breaks and sections.

### Specifying a default location for an entire file

If a file documents many breaks that pertain to the same `location`,
it may be specified once up front via `breaklocation` instead, and
omitted from individual break definitions. If an individual definition
still defines `location`, it will override `breaklocation`.

In Astro files:

```ts
/** @breaklocation Home & Search */
```

In Markdown frontmatter:

```yaml
breaklocation: Home & Search
```
