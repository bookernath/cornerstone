import 'foundation-sites/js/foundation.js';
import 'foundation-sites/js/foundation.dropdown.js';
import 'foundation-sites/js/foundation.reveal.js';
import 'foundation-sites/js/foundation.tabs.js';
// eslint-disable-next-line import/no-cycle
import modalFactory from './modal';
import revealCloseFactory from './reveal-close';

export default function ($element) {
    $element.foundation({
        dropdown: {
            // specify the class used for active dropdowns
            active_class: 'is-open',
        },
        reveal: {
            bg_class: 'modal-background',
            dismiss_modal_class: 'modal-close',
            close_on_background_click: true,
        },
        tab: {
            active_class: 'is-active',
        },
    });

    modalFactory('[data-reveal]', { $context: $element });
    revealCloseFactory('[data-reveal-close]', { $context: $element });
}
