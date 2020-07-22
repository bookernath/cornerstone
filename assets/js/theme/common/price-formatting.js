import { getShopperPreferredLocale } from 'stencil-preferred-locale';

const shopperLocale = getShopperPreferredLocale();

export function formatPriceForLocale(price) {
    try {
        return new Intl.NumberFormat(shopperLocale, { style: 'currency', currency: price.currency })
            .format(price.value);
    } catch {
        // If the price formatting fails for any reason, fall back to the price formatted by the backend
        return price.formatted;
    }
}