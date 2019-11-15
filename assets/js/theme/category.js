import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import fetchSwatches from './common/get-swatches';

function buildSwatchHtml(option) {
    return `<div class="form-field" data-product-attribute="swatch">
    <label class="form-label form-label--alternate form-label--inlineSmall">
        ${option.displayName}:
        <span data-option-value></span>
    </label>
    ${option.values.edges.map(node => node.node).map(value => `<input class="form-radio" type="radio" name="attribute[${option.entityId}]" value="${value.entityId}" id="attribute_swatch_${option.entityId}_${value.entityId}" ${value.isDefault ? 'checked data-default' : ''}>
        <label class="form-option form-option-swatch" for="attribute_swatch_${option.entityId}_${value.entityId}" data-product-attribute-value="${value.entityId}">
            ${value.imageUrl ? `<span class='form-option-variant form-option-variant--pattern' title="${value.label}" style="background-image: url('${value.imageUrl}');"></span>` : ''}
            ${value.hexColors.map(color => `<span class='form-option-variant form-option-variant--color' title="${value.label}" style="background-color: ${color}"></span>`)}
        </label>`).join('')}
</div>`;
}

function getSwatchesForProduct(product) {
    return product.productOptions.edges
        .map(node => node.node)
        .filter(node => node.displayStyle === 'Swatch')
        .map(node => buildSwatchHtml(node)).join('');
}

function getSwatchesForAllProducts(products) {
    return products.edges.map(node => ({ id: node.node.entityId, swatches: getSwatchesForProduct(node.node) }));
}

function injectSwatches(gqlResp) {
    const swatchData = getSwatchesForAllProducts(gqlResp.data.site.products);
    swatchData.forEach(productSwatches => {
        const $swatchContainer = $(`#swatches-${productSwatches.id}`)[0];
        $swatchContainer.innerHTML = productSwatches.swatches;
    });
}

export default class Category extends CatalogPage {
    onReady() {
        compareProducts(this.context.urls);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        if (this.context.productIds.length > 0) {
            fetchSwatches(this.context.storefrontAPIToken, this.context.productIds, injectSwatches);
        }
    }

    initFacetedSearch() {
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        });
    }
}
