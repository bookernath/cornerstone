# Catalyst Checkout Theme

A specialized Stencil theme designed as a fallback and support system for [BigCommerce Catalyst](https://github.com/bigcommerce/catalyst) storefronts.

## Overview

The **Catalyst Checkout Theme** serves as a seamless bridge between Catalyst (React-based) storefronts and essential e-commerce functionality that requires Stencil. Rather than replacing Catalyst, this theme acts as an intelligent fallback that automatically redirects users back to the main Catalyst storefront while preserving critical checkout and account management capabilities.

### Key Features

- **🔄 Automatic Redirection**: Most pages automatically redirect users back to Catalyst with a branded, customizable delay
- **🛒 Preserved Checkout Flow**: Complete, untouched checkout experience for seamless transactions
- **👤 Account Management**: Iframe-ready account pages for payment methods and gift certificate management
- **🎨 Brand Consistency**: Inherits store branding (logo, colors, typography) from theme settings
- **🌐 URL Preservation**: Maintains query parameters, anchors, and full URL structure during redirects
- **⚡ Performance First**: Minimal footprint with stripped-down configuration focused on essential functionality

## How It Works

### Page Classification

**Redirect Pages (→ Catalyst)**
- Homepage, product pages, category pages
- Cart, search results, brand pages
- Error pages (404, 403, 500, etc.)
- *These pages show a branded redirect screen and automatically send users to Catalyst*

**Preserved Pages (Stencil)**
- **Checkout Flow**: Complete payment processing (essential for transactions)
- **Account Payment Methods**: Credit card management (iframe-ready for Catalyst embedding)
- **Gift Certificates**: Balance checking and redemption (iframe-ready for Catalyst embedding)

### Redirect Experience

When users land on a redirect page, they see:
1. **Store branding** (logo and name from theme settings)
2. **Friendly messaging** ("Taking you to [Store Name]...")
3. **Automatic redirect** after configurable delay (0-5000ms)
4. **Manual fallback** button if auto-redirect fails
5. **Debug mode** for testing and development

## Theme Variations

Built on the **Soul Design System** with three curated variations:

- **Electric**: Vibrant green theme optimized for technology and modern retail
- **Luxury**: Sophisticated neutral tones perfect for premium brands
- **Warm**: Soft, muted warm tones ideal for lifestyle and wellness brands

Each variation includes optimized color palettes, typography choices, and styling that maintains consistency with modern Catalyst designs.

## Configuration

### Theme Settings

```json
{
  "catalyst_storefront_url": "https://your-catalyst-store.com",
  "redirect_delay": 1000,
  "enable_debug_mode": false
}
```

- **catalyst_storefront_url**: Target Catalyst URL (falls back to `{{settings.base_url}}` if empty)
- **redirect_delay**: Delay in milliseconds before redirect (0-5000ms)
- **enable_debug_mode**: Shows redirect notices and countdown for testing

### Color Tokens

The theme uses CSS custom properties for consistent branding:
- `--color-primary`: Main brand color
- `--color-accent`: Secondary accent color  
- `--color-background`/`--color-foreground`: Base contrast colors
- `--color-success`/`--color-error`/`--color-warning`/`--color-info`: Status colors

## Development

### Prerequisites

- **Node.js 20+** (Stencil CLI requirement)
- **npm 10+**
- **Stencil CLI**: `npm install -g @bigcommerce/stencil-cli`

### Setup

```bash
# Install dependencies
npm install

# Initialize Stencil configuration
stencil init

# Start development server
stencil start
```

### Build Commands

```bash
npm run build          # Production build
npm run buildDev       # Development build
grunt svgstore        # Generate SVG sprite
npm test              # Run Jest tests
npm run stylelint     # Lint SCSS files
```

### Stencil CLI Commands

```bash
stencil start         # Development server with live reload
stencil bundle        # Create theme bundle (.zip)
stencil push          # Upload theme to BigCommerce
stencil pull          # Download active theme configuration
```

### Deploying to Catalyst Channel

To deploy this theme to a specific Catalyst channel (required for Catalyst storefronts):

```bash
stencil push -a -c <channel-id>
```

**Example:**
```bash
stencil push -a -c 12345
```

**Flags:**
- `-a` or `--activate`: Automatically activates the theme after upload
- `-c` or `--channel_id`: Specifies the channel ID to deploy to

**Finding Your Channel ID:**
1. Navigate to **Channel Manager** in your BigCommerce admin
2. Select your Catalyst channel
3. The channel ID appears in the URL: `/manage/channel-manager/channels/{channel-id}`

**Important:** Always deploy to the correct Catalyst channel to ensure the checkout fallback functionality works properly with your Catalyst storefront.

## Architecture

### Template Structure

- **`layout/catalyst-redirect.html`**: Main redirect layout with branding and auto-redirect logic
- **`layout/iframe-ready.html`**: Isolated layout for embedding in Catalyst
- **`layout/base.html`**: Traditional layout (checkout only)
- **`components/common/catalyst-redirect.html`**: Reusable redirect component with debug mode

### JavaScript Redirect Logic

Uses modern `URL` API for robust redirect handling:
- Preserves complete URL structure (path + query + hash)
- Graceful fallback to meta refresh for broad browser support
- Error handling with console logging for debugging
- Configurable delays and debug mode support

### Theme Settings Integration

- Dynamic fallback from `catalyst_storefront_url` to `{{settings.base_url}}`
- Store branding integration (`{{settings.store_name}}`, `{{settings.store_logo}}`)
- Theme color tokens mapped to CSS custom properties
- Typography settings applied consistently across all pages

## Use Cases

- **Catalyst Stores**: Primary deployment as checkout-only fallback theme
- **Migration Period**: Temporary bridge during Catalyst adoption
- **Essential Services**: Hosting critical Stencil-dependent functionality
- **Iframe Embedding**: Account management pages embedded in Catalyst

## License

(The MIT License)  
Copyright (C) 2015-present BigCommerce Inc.  
All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.