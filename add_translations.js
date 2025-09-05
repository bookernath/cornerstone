const fs = require('fs');
const path = require('path');

const catalystRedirectTranslations = {
    "catalyst_redirect": {
        "heading": "Redirecting to Catalyst Storefront",
        "message": "You've accessed a Stencil page that should be handled by Catalyst. You will be automatically redirected to the correct page.",
        "countdown": "Redirecting in",
        "manual_redirect": "Continue to Catalyst Now"
    }
};

// Get all JSON files in lang directory
const langDir = './lang';
const files = fs.readdirSync(langDir).filter(file => file.endsWith('.json') && file !== 'en.json');

files.forEach(file => {
    const filePath = path.join(langDir, file);
    console.log(`Processing ${file}...`);
    
    try {
        // Read and parse the JSON file
        const content = fs.readFileSync(filePath, 'utf8');
        const json = JSON.parse(content);
        
        // Add catalyst_redirect translations if not already present
        if (!json.catalyst_redirect) {
            json.catalyst_redirect = catalystRedirectTranslations.catalyst_redirect;
            
            // Write back to file with proper formatting
            const updatedContent = JSON.stringify(json, null, 4);
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            console.log(`✓ Added catalyst_redirect translations to ${file}`);
        } else {
            console.log(`- ${file} already has catalyst_redirect translations`);
        }
    } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
    }
});

console.log('Translation update complete!');