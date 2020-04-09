import utils from '@bigcommerce/stencil-utils';
import a{ showAlertModal } from '../global/modal';


/**
 *
 * Add a product to cart
 *
 */

export default function addProductToCart(event, form) {
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
    utils.api.cart.itemAdd(this.filterEmptyFilesFromForm(new FormData(form)), (err, response) => {
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

            return showAlertModal(tmp.textContent || tmp.innerText);
        }

        redirectTo(response.data.cart_item.cart_url || this.context.urls.cart);
    });
}

/**
 * Checks if the current window is being run inside an iframe
 * @returns {boolean}
 */
function isRunningInIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

/**
 * Redirect to url
 *
 * @param {String} url
 */
function redirectTo(url) {
    if (isRunningInIframe() && !window.iframeSdk) {
        window.top.location = url;
    } else {
        window.location = url;
    }
}
