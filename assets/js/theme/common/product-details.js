import utils from '@bigcommerce/stencil-utils';
import ProductDetailsBase, { optionChangeDecorator } from './product-details-base';
import 'foundation-sites/js/foundation/foundation';
import 'foundation-sites/js/foundation/foundation.reveal';
import ImageGallery from '../product/image-gallery';
import modalFactory, { alertModal, showAlertModal } from '../global/modal';
import { isEmpty, isPlainObject } from 'lodash';
import nod from '../common/nod';
import { announceInputErrorMessage } from '../common/utils/form-utils';
import forms from '../common/models/forms';
import { normalizeFormData } from './utils/api';
import { isBrowserIE, convertIntoArray } from './utils/ie-helpers';
import bannerUtils from './utils/banner-utils';
import runGraphQLQuery from '../global/graphql-request';
import gql from 'graphql-tag';

export default class ProductDetails extends ProductDetailsBase {
    constructor($scope, context, productAttributesData = {}) {
        super($scope, context);

        this.$overlay = $('[data-cart-item-add] .loadingOverlay');
        this.imageGallery = new ImageGallery($('[data-image-gallery]', this.$scope));
        this.imageGallery.init();
        this.listenQuantityChange();
        this.$swatchOptionMessage = $('.swatch-option-message');
        this.swatchInitMessageStorage = {};
        this.swatchGroupIdList = $('[id^="swatchGroup"]').map((_, group) => $(group).attr('id'));
        this.storeInitMessagesForSwatches();

        const $form = $('form[data-cart-item-add]', $scope);

        this.addToCartValidator = nod({
            submit: $form.find('input#form-action-addToCart'),
            tap: announceInputErrorMessage,
        });

        const $productOptionsElement = $('[data-product-option-change]', $form);
        const hasOptions = $productOptionsElement.html().trim().length;
        const hasDefaultOptions = $productOptionsElement.find('[data-default]').length;
        const $productSwatchGroup = $('[id*="attribute_swatch"]', $form);
        const $productSwatchLabels = $('.form-option-swatch', $form);
        const placeSwatchLabelImage = (_, label) => {
            const $optionImage = $('.form-option-expanded', $(label));
            const optionImageWidth = $optionImage.outerWidth();
            const extendedOptionImageOffsetLeft = 55;
            const { right } = label.getBoundingClientRect();
            const emptySpaceToScreenRightBorder = window.screen.width - right;
            const shiftValue = optionImageWidth - emptySpaceToScreenRightBorder;

            if (emptySpaceToScreenRightBorder < (optionImageWidth + extendedOptionImageOffsetLeft)) {
                $optionImage.css('left', `${shiftValue > 0 ? -shiftValue : shiftValue}px`);
            }
        };

        $(window).on('load', () => {
            this.registerAddToCartValidation();
            $.each($productSwatchLabels, placeSwatchLabelImage);
        });

        if (context.showSwatchNames) {
            this.$swatchOptionMessage.removeClass('u-hidden');

            $productSwatchGroup.on('change', ({ target }) => {
                const swatchGroupElement = target.parentNode.parentNode;

                this.showSwatchNameOnOption($(target), $(swatchGroupElement));
            });

            $.each($productSwatchGroup, (_, element) => {
                const swatchGroupElement = element.parentNode.parentNode;

                if ($(element).is(':checked')) this.showSwatchNameOnOption($(element), $(swatchGroupElement));
            });
        }

        $productOptionsElement.on('change', event => {
            this.productOptionsChanged(event);
            this.setProductVariant();
        });

        $form.on('submit', event => {
            this.addToCartValidator.performCheck();

            if (this.addToCartValidator.areAll('valid')) {
                this.addProductToCart(event, $form[0]);
            }
        });

        this.productId = $('[name="product_id"]', $form).val();

        // Update product attributes. Also update the initial view in case items are oos
        // or have default variant properties that change the view
        if ((isEmpty(productAttributesData) || hasDefaultOptions) && hasOptions) {
            utils.api.productAttributes.optionChange(this.productId, $form.serialize(), 'products/bulk-discount-rates', (err, response) => {
                const attributesData = response.data || {};
                const attributesContent = response.content || {};
                this.updateProductAttributes(attributesData);
                if (hasDefaultOptions) {
                    this.updateView(attributesData, attributesContent);
                } else {
                    this.updateDefaultAttributesForOOS(attributesData);
                }
            });
        } else {
            this.updateProductAttributes(productAttributesData);
            bannerUtils.dispatchProductBannerEvent(productAttributesData);
        }

        $productOptionsElement.show();

        this.previewModal = modalFactory('#previewModal')[0];

        this.multipleChoiceOptionsState = this.getMultipleChoiceOptionsState(this.context.productOptionsState);

        Promise.all(this.getMultipleChoiceLookAheadQueries(this.multipleChoiceOptionsState)
            .map(query => runGraphQLQuery(
                this.context.storefrontAPIToken,
                query,
            )))
            .then(responses => responses.map(res => res.data.site)
                .reduce((acc, site) => ({ ...acc, ...site })))
            .then(data => Object.keys(data)
                .filter(key => !key.startsWith('__'))
                .map(key => ({
                    valueIds: this.getOptionValueIdsFromGraphQLAliasString(key),
                    data: data[key],
                })))
            .then(lookAheadData => this.updateProductAttributeLookAheadPrices(lookAheadData));
    }

    getMultipleChoiceOptionsState(rawState) {
        // return rawState.filter(option => option.type.startsWith('Configurable_PickList_'));
        // Only run requests for "select" options for now
        return rawState.filter(option => option.partial.startsWith('set-select'));
    }

    getSelectedOptionValueEntityIdsFromState(state) {
        return state.map(option => option.values.filter(value => value.selected).map(value => ({
            oid: option.id,
            vid: value.id,
        }))).reduce((acc, val) => acc.concat(val));
    }

    getNonSelectedOptionValueEntityIdsFromState(state) {
        return state.map(option => option.values.filter(value => !value.selected).map(value => ({
            oid: option.id,
            vid: value.id,
        }))).reduce((acc, val) => acc.concat(val));
    }

    getLookAheadValueEntityIdsFromState(state) {
        const selected = this.getSelectedOptionValueEntityIdsFromState(state);
        const nonselected = this.getNonSelectedOptionValueEntityIdsFromState(state);
        return nonselected.map(lookAheadValue => (selected.concat(lookAheadValue)));
    }

    getProductOptionSetAlias(productId, optionEntityIds) {
        return `p${productId}${optionEntityIds.map(o => `o${o.oid}v${o.vid}`).join('')}: `
            + `product( entityId: ${this.productId},`
            + `optionValueIds:[${optionEntityIds
                .map(o => `{optionEntityId: ${o.oid}, valueEntityId: ${o.vid}}`)}])`;
    }

    getOptionValueIdsFromGraphQLAliasString(string) {
        /*
            Accept GraphQL JSON key of the form 'p6606o2403v2718o2404v2719'
            Return an object of option IDs and option value IDs of the form
                        {2403: 2718, 2404: 2719}
         */
        const [, ...ovStrings] = string.split('p')[1].split('o');

        return ovStrings.map(ovString => parseInt(ovString.split('v')[1], 10));
    }


    chunk(arr, chunkSize) {
        const R = [];
        for (let i = 0, len = arr.length; i < len; i += chunkSize) { R.push(arr.slice(i, i + chunkSize)); }
        return R;
    }

    getMultipleChoiceLookAheadQueries(state) {
        const selected = this.getSelectedOptionValueEntityIdsFromState(state);
        const nonselected = this.getNonSelectedOptionValueEntityIdsFromState(state);

        const productOptionSetChunks = this.chunk(nonselected.map(lookAheadValue => (selected.concat(lookAheadValue))), 4);

        return productOptionSetChunks.map(productOptionSets => gql`
        query getLookAheadProductOptionData {
          site {
            ${productOptionSets.map(optionEntityIds => `${this.getProductOptionSetAlias(this.productId, optionEntityIds)} {
              ...ProductFields
            }`).join('\n')}
          }
        }

        fragment ProductFields on Product{
          availability
          prices {
            price {
              value
              currencyCode
            }
          }
        }`);
    }

    registerAddToCartValidation() {
        this.addToCartValidator.add([{
            selector: '[data-quantity-change] > .form-input--incrementTotal',
            validate: (cb, val) => {
                const result = forms.numbersOnly(val);
                cb(result);
            },
            errorMessage: this.context.productQuantityErrorMessage,
        }]);

        return this.addToCartValidator;
    }

    storeInitMessagesForSwatches() {
        if (this.swatchGroupIdList.length && isEmpty(this.swatchInitMessageStorage)) {
            this.swatchGroupIdList.each((_, swatchGroupId) => {
                if (!this.swatchInitMessageStorage[swatchGroupId]) {
                    this.swatchInitMessageStorage[swatchGroupId] = $(`#${swatchGroupId} ~ .swatch-option-message`).text().trim();
                }
            });
        }
    }

    setProductVariant() {
        const unsatisfiedRequiredFields = [];
        const options = [];

        $.each($('[data-product-attribute]'), (index, value) => {
            const optionLabel = value.children[0].innerText;
            const optionTitle = optionLabel.split(':')[0].trim();
            const required = optionLabel.toLowerCase().includes('required');
            const type = value.getAttribute('data-product-attribute');

            if ((type === 'input-file' || type === 'input-text' || type === 'input-number') && value.querySelector('input').value === '' && required) {
                unsatisfiedRequiredFields.push(value);
            }

            if (type === 'textarea' && value.querySelector('textarea').value === '' && required) {
                unsatisfiedRequiredFields.push(value);
            }

            if (type === 'date') {
                const isSatisfied = Array.from(value.querySelectorAll('select')).every((select) => select.selectedIndex !== 0);

                if (isSatisfied) {
                    const dateString = Array.from(value.querySelectorAll('select')).map((x) => x.value).join('-');
                    options.push(`${optionTitle}:${dateString}`);

                    return;
                }

                if (required) {
                    unsatisfiedRequiredFields.push(value);
                }
            }

            if (type === 'set-select') {
                const select = value.querySelector('select');
                const selectedIndex = select.selectedIndex;

                if (selectedIndex !== 0) {
                    options.push(`${optionTitle}:${select.options[selectedIndex].innerText}`);

                    return;
                }

                if (required) {
                    unsatisfiedRequiredFields.push(value);
                }
            }

            if (type === 'set-rectangle' || type === 'set-radio' || type === 'swatch' || type === 'input-checkbox' || type === 'product-list') {
                const checked = value.querySelector(':checked');
                if (checked) {
                    const getSelectedOptionLabel = () => {
                        const productVariantslist = convertIntoArray(value.children);
                        const matchLabelForCheckedInput = inpt => inpt.dataset.productAttributeValue === checked.value;
                        return productVariantslist.filter(matchLabelForCheckedInput)[0];
                    };
                    if (type === 'set-rectangle' || type === 'set-radio' || type === 'product-list') {
                        const label = isBrowserIE ? getSelectedOptionLabel().innerText.trim() : checked.labels[0].innerText;
                        if (label) {
                            options.push(`${optionTitle}:${label}`);
                        }
                    }

                    if (type === 'swatch') {
                        const label = isBrowserIE ? getSelectedOptionLabel().children[0] : checked.labels[0].children[0];
                        if (label) {
                            options.push(`${optionTitle}:${label.title}`);
                        }
                    }

                    if (type === 'input-checkbox') {
                        options.push(`${optionTitle}:Yes`);
                    }

                    return;
                }

                if (type === 'input-checkbox') {
                    options.push(`${optionTitle}:No`);
                }

                if (required) {
                    unsatisfiedRequiredFields.push(value);
                }
            }
        });

        let productVariant = unsatisfiedRequiredFields.length === 0 ? options.sort().join(', ') : 'unsatisfied';
        const view = $('.productView');

        if (productVariant) {
            productVariant = productVariant === 'unsatisfied' ? '' : productVariant;
            if (view.attr('data-event-type')) {
                view.attr('data-product-variant', productVariant);
            } else {
                const productName = view.find('.productView-title')[0].innerText.replace(/"/g, '\\$&');
                const card = $(`[data-name="${productName}"]`);
                card.attr('data-product-variant', productVariant);
            }
        }
    }

    /**
     * Checks if the current window is being run inside an iframe
     * @returns {boolean}
     */
    isRunningInIframe() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    /**
     *
     * Handle product options changes
     *
     */
    productOptionsChanged(event) {
        const $changedOption = $(event.target);
        const $form = $changedOption.parents('form');

        // Add some handling here to re-flow lookahead prices when option selections change

        // Do not trigger an ajax request if it's a file or if the browser doesn't support FormData
        if ($changedOption.attr('type') === 'file' || window.FormData === undefined) {
            return;
        }

        utils.api.productAttributes.optionChange(this.productId, $form.serialize(), 'products/bulk-discount-rates', (err, response) => {
            const productAttributesData = response.data || {};
            const productAttributesContent = response.content || {};
            this.updateProductAttributes(productAttributesData);
            this.updateView(productAttributesData, productAttributesContent);
            bannerUtils.dispatchProductBannerEvent(productAttributesData);

            if (!this.checkIsQuickViewChild($form)) {
                const $context = $form.parents('.productView').find('.productView-info');
                modalFactory('[data-reveal]', { $context });
            }
        });
    }

    /**
     * if this setting is enabled in Page Builder
     * show name for swatch option
     */
    showSwatchNameOnOption($swatch, $swatchGroup) {
        const swatchName = $swatch.attr('aria-label');
        const activeSwatchGroupId = $swatchGroup.attr('aria-labelledby');
        const $swatchOptionMessage = $(`#${activeSwatchGroupId} ~ .swatch-option-message`);

        $('[data-option-value]', $swatchGroup).text(swatchName);
        $swatchOptionMessage.text(`${this.swatchInitMessageStorage[activeSwatchGroupId]} ${swatchName}`);
        this.setLiveRegionAttributes($swatchOptionMessage, 'status', 'assertive');
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    checkIsQuickViewChild($element) {
        return !!$element.parents('.quickView').length;
    }

    showProductImage(image) {
        if (isPlainObject(image)) {
            const zoomImageUrl = utils.tools.imageSrcset.getSrcset(
                image.data,
                { '1x': this.context.zoomSize },
                /*
                    Should match zoom size used for data-zoom-image in
                    components/products/product-view.html

                    Note that this will only be used as a fallback image for browsers that do not support srcset

                    Also note that getSrcset returns a simple src string when exactly one size is provided
                */
            );

            const mainImageUrl = utils.tools.imageSrcset.getSrcset(
                image.data,
                { '1x': this.context.productSize },
                /*
                    Should match fallback image size used for the main product image in
                    components/products/product-view.html

                    Note that this will only be used as a fallback image for browsers that do not support srcset

                    Also note that getSrcset returns a simple src string when exactly one size is provided
                */
            );

            const mainImageSrcset = utils.tools.imageSrcset.getSrcset(image.data);

            this.imageGallery.setAlternateImage({
                mainImageUrl,
                zoomImageUrl,
                mainImageSrcset,
            });
        } else {
            this.imageGallery.restoreImage();
        }
    }

    /**
     *
     * Handle action when the shopper clicks on + / - for quantity
     *
     */
    listenQuantityChange() {
        this.$scope.on('click', '[data-quantity-change] button', event => {
            event.preventDefault();
            const $target = $(event.currentTarget);
            const viewModel = this.getViewModel(this.$scope);
            const $input = viewModel.quantity.$input;
            const quantityMin = parseInt($input.data('quantityMin'), 10);
            const quantityMax = parseInt($input.data('quantityMax'), 10);

            let qty = forms.numbersOnly($input.val()) ? parseInt($input.val(), 10) : quantityMin;
            // If action is incrementing
            if ($target.data('action') === 'inc') {
                qty = forms.validateIncreaseAgainstMaxBoundary(qty, quantityMax);
            } else if (qty > 1) {
                qty = forms.validateDecreaseAgainstMinBoundary(qty, quantityMin);
            }

            // update hidden input
            viewModel.quantity.$input.val(qty);
            // update text
            viewModel.quantity.$text.text(qty);
            // perform validation after updating product quantity
            this.addToCartValidator.performCheck();
        });

        // Prevent triggering quantity change when pressing enter
        this.$scope.on('keypress', '.form-input--incrementTotal', event => {
            // If the browser supports event.which, then use event.which, otherwise use event.keyCode
            const x = event.which || event.keyCode;
            if (x === 13) {
                // Prevent default
                event.preventDefault();
            }
        });
    }

    /**
     *
     * Add a product to cart
     *
     */
    addProductToCart(event, form) {
        const $addToCartBtn = $('#form-action-addToCart', $(event.target));
        const originalBtnVal = $addToCartBtn.val();
        const waitMessage = $addToCartBtn.data('waitMessage');

        // Do not do AJAX if browser doesn't support FormData
        if (window.FormData === undefined) {
            return;
        }

        // Prevent default
        event.preventDefault();

        $addToCartBtn
            .val(waitMessage)
            .prop('disabled', true);

        this.$overlay.show();

        // Add item to cart
        utils.api.cart.itemAdd(normalizeFormData(new FormData(form)), (err, response) => {
            const errorMessage = err || response.data.error;

            $addToCartBtn
                .val(originalBtnVal)
                .prop('disabled', false);

            this.$overlay.hide();

            // Guard statement
            if (errorMessage) {
                // Strip the HTML from the error message
                const tmp = document.createElement('DIV');
                tmp.innerHTML = errorMessage;

                if (!this.checkIsQuickViewChild($addToCartBtn)) {
                    alertModal().$preModalFocusedEl = $addToCartBtn;
                }

                return showAlertModal(tmp.textContent || tmp.innerText);
            }

            // Open preview modal and update content
            if (this.previewModal) {
                this.previewModal.open();

                if (window.ApplePaySession) {
                    this.previewModal.$modal.addClass('apple-pay-supported');
                }

                if (!this.checkIsQuickViewChild($addToCartBtn)) {
                    this.previewModal.$preModalFocusedEl = $addToCartBtn;
                }

                this.updateCartContent(this.previewModal, response.data.cart_item.id);
            } else {
                this.$overlay.show();
                // if no modal, redirect to the cart page
                this.redirectTo(response.data.cart_item.cart_url || this.context.urls.cart);
            }
        });

        this.setLiveRegionAttributes($addToCartBtn.next(), 'status', 'polite');
    }

    /**
     * Get cart contents
     *
     * @param {String} cartItemId
     * @param {Function} onComplete
     */
    getCartContent(cartItemId, onComplete) {
        const options = {
            template: 'cart/preview',
            params: {
                suggest: cartItemId,
            },
            config: {
                cart: {
                    suggestions: {
                        limit: 4,
                    },
                },
            },
        };

        utils.api.cart.getContent(options, onComplete);
    }

    /**
     * Redirect to url
     *
     * @param {String} url
     */
    redirectTo(url) {
        if (this.isRunningInIframe() && !window.iframeSdk) {
            window.top.location = url;
        } else {
            window.location = url;
        }
    }

    /**
     * Update cart content
     *
     * @param {Modal} modal
     * @param {String} cartItemId
     * @param {Function} onComplete
     */
    updateCartContent(modal, cartItemId, onComplete) {
        this.getCartContent(cartItemId, (err, response) => {
            if (err) {
                return;
            }

            modal.updateContent(response);

            // Update cart counter
            const $body = $('body');
            const $cartQuantity = $('[data-cart-quantity]', modal.$content);
            const $cartCounter = $('.navUser-action .cart-count');
            const quantity = $cartQuantity.data('cartQuantity') || 0;
            const $promotionBanner = $('[data-promotion-banner]');
            const $backToShopppingBtn = $('.previewCartCheckout > [data-reveal-close]');
            const $modalCloseBtn = $('#previewModal > .modal-close');
            const bannerUpdateHandler = () => {
                const $productContainer = $('#main-content > .container');

                $productContainer.append('<div class="loadingOverlay pdp-update"></div>');
                $('.loadingOverlay.pdp-update', $productContainer).show();
                window.location.reload();
            };

            $cartCounter.addClass('cart-count--positive');
            $body.trigger('cart-quantity-update', quantity);

            if (onComplete) {
                onComplete(response);
            }

            if ($promotionBanner.length && $backToShopppingBtn.length) {
                $backToShopppingBtn.on('click', bannerUpdateHandler);
                $modalCloseBtn.on('click', bannerUpdateHandler);
            }
        });
    }

    /**
     * Hide or mark as unavailable out of stock attributes if enabled
     * @param  {Object} data Product attribute data
     */
    updateProductAttributes(data) {
        super.updateProductAttributes(data);
        this.showProductImage(data.image);

        if (behavior !== 'hide_option' && behavior !== 'label_option') {
            return;
        }

        $('[data-product-attribute-value]', this.$scope).each((i, attribute) => {
            const $attribute = $(attribute);
            const attrId = parseInt($attribute.data('productAttributeValue'), 10);


            if (inStockIds.indexOf(attrId) !== -1) {
                this.enableAttribute($attribute, behavior, outOfStockMessage);
            } else {
                this.disableAttribute($attribute, behavior, outOfStockMessage);
            }
        });
    }

    /**
     * Add new price to select options from GraphQL data
     */
    updateProductAttributeLookAheadPrices(data) {
        $('[data-product-attribute-value]', this.$scope).each((i, attribute) => {
            const $attribute = $(attribute);
            const attrId = parseInt($attribute.data('productAttributeValue'), 10);

            const newDataForAttribute = data.find(obj => obj.valueIds.indexOf(attrId) !== -1);
            if (newDataForAttribute) {
                this.addNewPriceToAttribute($attribute, newDataForAttribute.data.prices.price);
            } else {
                this.removePriceFromAttribute($attribute);
            }
        });
    }

    formatPrice(price) {
        return new Intl.NumberFormat(navigator.language, {
            style: 'currency',
            currency: price.currencyCode,
        }).format(price.value);
    }

    addNewPriceToAttribute($attribute, price) {
        if (this.getAttributeType($attribute) === 'set-select') {
            $(`<span class="look-ahead-price" data-price-value="${price.value}"> (${this.formatPrice(price)})</span>`)
                .appendTo($attribute);
        }
    }

    removePriceFromAttribute($attribute) {
        $attribute.find('.look-ahead-price').remove();
    }

    disableAttribute($attribute, behavior, outOfStockMessage) {
        if (this.getAttributeType($attribute) === 'set-select') {
            return this.disableSelectOptionAttribute($attribute, behavior, outOfStockMessage);
        }

        if (behavior === 'hide_option') {
            $attribute.hide();
        } else {
            $attribute.addClass('unavailable');
        }
    }

    disableSelectOptionAttribute($attribute, behavior, outOfStockMessage) {
        const $select = $attribute.parent();

        if (behavior === 'hide_option') {
            $attribute.toggleOption(false);
            // If the attribute is the selected option in a select dropdown, select the first option (MERC-639)
            if ($select.val() === $attribute.attr('value')) {
                $select[0].selectedIndex = 0;
            }
        } else {
            $attribute.attr('disabled', 'disabled');
            $attribute.html($attribute.html().replace(outOfStockMessage, '') + outOfStockMessage);
        }
    }

    enableAttribute($attribute, behavior, outOfStockMessage) {
        if (this.getAttributeType($attribute) === 'set-select') {
            return this.enableSelectOptionAttribute($attribute, behavior, outOfStockMessage);
        }

        if (behavior === 'hide_option') {
            $attribute.show();
        } else {
            $attribute.removeClass('unavailable');
        }
    }

    enableSelectOptionAttribute($attribute, behavior, outOfStockMessage) {
        if (behavior === 'hide_option') {
            $attribute.toggleOption(true);
        } else {
            $attribute.prop('disabled', false);
            $attribute.html($attribute.html().replace(outOfStockMessage, ''));
        }
    }

    getAttributeType($attribute) {
        const $parent = $attribute.closest('[data-product-attribute]');

        return $parent ? $parent.data('productAttribute') : null;
    }

    /**
     * Allow radio buttons to get deselected
     */
    initRadioAttributes() {
        $('[data-product-attribute] input[type="radio"]', this.$scope).each((i, radio) => {
            const $radio = $(radio);

            // Only bind to click once
            if ($radio.attr('data-state') !== undefined) {
                $radio.on('click', () => {
                    if ($radio.data('state') === true) {
                        $radio.prop('checked', false);
                        $radio.data('state', false);

                        $radio.trigger('change');
                    } else {
                        $radio.data('state', true);
                    }

                    this.initRadioAttributes();
                });
            }

            $radio.attr('data-state', $radio.prop('checked'));
        });
    }

    /**
     * Check for fragment identifier in URL requesting a specific tab
     */
    getTabRequests() {
        if (window.location.hash && window.location.hash.indexOf('#tab-') === 0) {
            const $activeTab = $('.tabs').has(`[href='${window.location.hash}']`);
            const $tabContent = $(`${window.location.hash}`);

            if ($activeTab.length > 0) {
                $activeTab.find('.tab')
                    .removeClass('is-active')
                    .has(`[href='${window.location.hash}']`)
                    .addClass('is-active');

                $tabContent.addClass('is-active')
                    .siblings()
                    .removeClass('is-active');
            }
        }
    }
}
