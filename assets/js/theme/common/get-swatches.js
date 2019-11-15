import request from './graphql-request';

/**
 * Get the details of any Product Swatch options from a list of product IDs
 */
export default function (token, productIds, callback) {
    const query = {
        query: `{ site {
                    products(entityIds:[${productIds}]) {
                        edges {
                            node {
                                name
                                entityId
                                variants(first: 50) {
                                    edges {
                                        node {
                                            sku
                                        }
                                    }
                                }
                                productOptions(first:3) {
                                    edges {
                                        node {
                                            displayName
                                            entityId
                                            ... on MultipleChoiceOption {
                                                displayStyle
                                                values(first: 10) {
                                                    edges {
                                                        node {
                                                            label
                                                            entityId
                                                            ... on SwatchOptionValue {
                                                                hexColors
                                                                imageUrl(width: 80)
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }`,
    };

    request(token, query, callback);
}
