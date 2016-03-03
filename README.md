[![Join the chat at https://gitter.im/poeblackmarket/poeblackmarket.github.io](https://badges.gitter.im/poeblackmarket/poeblackmarket.github.io.svg)](https://gitter.im/poeblackmarket/poeblackmarket.github.io?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Path of Exile Blackmarket - An Advance Search Engine

![poesearchalpha](https://cloud.githubusercontent.com/assets/75921/13418232/a3264698-dfae-11e5-8d0e-bd073370476c.PNG)

## Requirements

You'll need the following software installed to get started.

  - [Node.js](http://nodejs.org): Use the installer for your OS.
  - [Git](http://git-scm.com/downloads): Use the installer for your OS.
    - Windows users can also try [Git for Windows](http://git-for-windows.github.io/).
  - [Gulp](http://gulpjs.com/) and [Bower](http://bower.io): Run `npm install -g gulp bower`
    - Depending on how Node is configured on your machine, you may need to run `sudo npm install -g gulp bower` instead, if you get an error with the first command.

## Get Started

Clone this repository using git.

```bash
git clone https://github.com/poeblackmarket/poeblackmarket.github.io.git
```

Change into the directory.

```bash
cd app
```

Install the dependencies. If you're running Mac OS or Linux, you may need to run `sudo npm install` instead, depending on how your machine is configured.

```bash
npm install
bower install
```

While you're working on your project, run:

```bash
npm start
```

This will compile the Sass and assemble your Angular app. **Now go to `localhost:8080` in your browser to see it in action.** When you change any file in the `client` folder, the appropriate Gulp task will run to build new files.

To run the compiling process once, without watching any files, use the `build` command.

```bash
npm start build
```

This will build your project once with minified/uglified JS:

```bash
gulp build --production
```

This will build a demo version (uploaded to github) once with minified/uglified JS:

```bash
gulp build --production --demo
```

## Dev Notes

Got this one my `.bashrc`. This will do git add/commit/push in one command.

```bash
function gita() {
    git add .
    git commit -a -m "$1"
    git push origin master
}
```
