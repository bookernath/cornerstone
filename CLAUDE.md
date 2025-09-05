# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **catalyst-checkout-theme**, a specialized Stencil theme built from Cornerstone that serves as a fallback and support system for Catalyst storefronts. The theme is purpose-built to handle scenarios where shoppers using Catalyst may "fall through" to Stencil pages.

### Key Features
- **Automatic Redirection**: Most pages redirect users back to Catalyst
- **Iframe-Ready Pages**: Essential pages designed for embedding in Catalyst
- **Catalyst Color Harmony**: Uses Soul design system colors (Electric, Luxury, Warm)
- **Minimal Footprint**: Stripped-down configuration focused on checkout functionality

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

## Theme Architecture

### Catalyst Integration
The theme operates in two primary modes:

1. **Redirect Mode**: Most pages use `layout/catalyst-redirect.html` to automatically redirect users to Catalyst
2. **Iframe Mode**: Essential pages use `layout/iframe-ready.html` for embedding in Catalyst

### Page Classification

#### Redirect Pages (→ Catalyst)
- Homepage (`home.html`)
- Product pages (`product.html`)
- Category pages (`category.html`) 
- Cart page (`cart.html`)
- Search results (`search.html`)
- Brand pages (`brand.html`, `brands.html`)

#### Preserved Pages (Stencil)
- **Checkout**: Complete checkout flow (untouched for critical functionality)
- **Payment Methods**: Account payment method management (iframe-ready)
- **Gift Certificates**: Balance checking functionality (iframe-ready)

#### Key Components
- `components/common/catalyst-redirect.html` - Universal redirect logic
- Theme settings for Catalyst URL and redirect timing
- Iframe communication scripts for parent-child messaging

### Template System
- **Redirect Layout**: `layout/catalyst-redirect.html` - Minimal layout with redirect functionality
- **Iframe Layout**: `layout/iframe-ready.html` - Isolated layout for embedding
- **Base Layout**: `layout/base.html` - Traditional layout (checkout only)

### Theme Variations (Soul Design System)
1. **Electric**: Vibrant green theme (`oklch(90.35% 0.22 136.76)`)
2. **Luxury**: Sophisticated neutral theme (`oklch(62.85% 0.087 88.95)`)
3. **Warm**: Soft warm tone theme (`oklch(82.53% 0.171 80.01)`)

### Configuration
- `catalyst_storefront_url`: Target Catalyst URL for redirects
- `redirect_delay`: Configurable delay before redirect (0-5000ms)
- `enable_debug_mode`: Shows redirect notices for testing
- Soul color tokens mapped to Catalyst design system

## Node.js Requirements
- Node.js version 20
- npm version 10
- Always delete `package-lock.json` when using different Node/npm versions
- Use `npm update <package>` or `npm install <package>` for dependency updates (avoid `npm install` for updates)

## Testing
- Jest configured for unit testing
- Test files should follow Jest conventions
- Use `npm test:watch` for TDD workflow