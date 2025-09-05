# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cornerstone is BigCommerce's reference Stencil theme built with ES6 JavaScript, Handlebars templates, and SCSS. It serves as the foundation for premium BigCommerce theme development.

## Stencil CLI Setup

### Prerequisites
- Python 3+
- Node.js 20+ (Stencil CLI requires Node.js 20.16.0)
- Stencil CLI: `npm install -g @bigcommerce/stencil-cli`

### Initial Setup
1. **Install dependencies**: `npm install`
2. **Initialize Stencil configuration**: `stencil init`
   - Creates `.stencil`, `secrets.stencil.json`, and `config.stencil.json` files
   - Requires store URL, API token, and port configuration
3. **Start development server**: `stencil start`
   - Launches Browsersync development environment
   - Use `stencil start --open` to auto-open browser

### Stencil CLI Commands
- `stencil start` - Start local development server with live preview
- `stencil bundle` - Bundle theme into structured .zip file
- `stencil push` - Bundle and upload theme to BigCommerce store
- `stencil pull` - Pull configuration from active theme on live store
- `stencil init` - Initialize theme configuration files

### Development Workflow
1. Make changes to theme files
2. View live preview at localhost URL (usually http://localhost:3000)
3. Add `?debug=context` to URL to view page data
4. Add `?debug=bar` to see JSON objects and rendered page simultaneously

## Additional Development Commands

### Build and Asset Management
- `npm run build` - Production build using webpack
- `npm run buildDev` - Development build with webpack dev config
- `grunt` - Default task (runs svgstore)
- `grunt svgstore` - Generate SVG sprite from individual icons in assets/icons/

### Testing and Code Quality
- `npm test` - Run Jest tests
- `npm test:watch` - Run Jest tests in watch mode
- `npx eslint <files>` - Lint JavaScript files
- `npm run stylelint` - Lint SCSS files
- `npm run stylelint:fix` - Auto-fix SCSS linting issues

## Architecture

### JavaScript Structure
The theme uses a modular page-based architecture centered around the `PageManager` class:

1. **Entry Point**: `assets/js/app.js` - Defines the `stencilBootstrap` function that dynamically loads page-specific modules
2. **Page Classes**: Each page type (product, cart, category, etc.) extends `PageManager` and is loaded on demand
3. **Global Module**: `assets/js/theme/global.js` - Handles site-wide functionality like navigation, cart preview, and quick search

### Page Mapping
Pages are mapped in `assets/js/app.js` using dynamic imports for performance:
- Account pages → `theme/account.js`
- Product pages → `theme/product.js` 
- Cart → `theme/cart.js`
- Category → `theme/category.js`
- etc.

### Template System
- **Templates**: Handlebars files in `templates/` directory
- **Components**: Reusable template parts in `templates/components/`
- **Layouts**: Base layouts in `templates/layout/`
- **Context Injection**: Use `{{inject}}` and `{{jsContext}}` helpers to pass server-side data to client-side JavaScript

### Asset Organization
- **JavaScript**: `assets/js/` - Modular ES6 code with webpack bundling
- **Styles**: `assets/scss/` - SCSS files with component-based structure  
- **Icons**: `assets/icons/` - Individual SVG files compiled into a sprite
- **Images**: `assets/img/` - Static image assets

### Build System
- **Webpack**: Handles JavaScript bundling and optimization
- **Grunt**: Manages SVG icon compilation and other asset tasks
- **Stencil CLI**: BigCommerce's development tool for theme compilation

## Node.js Requirements
- Node.js version 20
- npm version 10
- Always delete `package-lock.json` when using different Node/npm versions
- Use `npm update <package>` or `npm install <package>` for dependency updates (avoid `npm install` for updates)

## Testing
- Jest configured for unit testing
- Test files should follow Jest conventions
- Use `npm test:watch` for TDD workflow